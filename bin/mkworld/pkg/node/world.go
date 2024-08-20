/*
 *  SPDX-License-Identifier: AGPL-3.0-only
 *  Copyright (C) 2023 by kmahyyg in Patmeow Limited
 */

package node

import (
	"bytes"
	"encoding/binary"
	"net"
	"strconv"
	"strings"
	"syscall"
)

// Code reproduced from https://github.com/zerotier/ZeroTierOne/blob/e0a3291235230352148d5d30e51b341bfd9ad458/node/World.hpp

const (
	// ZT_WORLD_MAX_ROOTS is the Maximum number of roots (sanity limit, okay to increase)
	//
	// A given root can (through multi-homing) be distributed across any number of
	// physical endpoints, but having more than one is good to permit total failure
	// of one root or its withdrawal due to compromise without taking the whole net
	// down.
	ZT_WORLD_MAX_ROOTS = 4
	// ZT_WORLD_MAX_STABLE_ENDPOINTS_PER_ROOT is the Maximum number of stable endpoints per root (sanity limit, okay to increase)
	ZT_WORLD_MAX_STABLE_ENDPOINTS_PER_ROOT = 32
	// ZT_WORLD_MAX_SERIALIZED_LENGTH is the (more than) maximum length of a serialized World
	ZT_WORLD_MAX_SERIALIZED_LENGTH = ((1024 + (32 * ZT_WORLD_MAX_STABLE_ENDPOINTS_PER_ROOT)) *
		ZT_WORLD_MAX_ROOTS) + ZT_C25519_PUBLIC_KEY_LEN + ZT_C25519_SIGNATURE_LEN + 128
)

type ZtWorldID = uint64

const (
	// ZT_WORLD_ID_EARTH is the official world in production ZeroTier Cloud
	ZT_WORLD_ID_EARTH ZtWorldID = 149604618
	// ZT_WORLD_ID_MARS is reserved world for future
	ZT_WORLD_ID_MARS = 227883110
)

type ZtWorldType = uint8

const (
	// ZT_WORLD_TYPE_NULL should never be used in real world, but it's not invalid
	ZT_WORLD_TYPE_NULL ZtWorldType = iota
	// ZT_WORLD_TYPE_PLANET Planets, of which there is currently one (Earth)
	ZT_WORLD_TYPE_PLANET
	// ZT_WORLD_TYPE_MOON are user-created and many
	ZT_WORLD_TYPE_MOON = 127
)

type ZtWorld struct {
	Type                            ZtWorldType
	ID                              ZtWorldID
	Timestamp                       uint64
	PublicKeyMustBeSignedByNextTime [ZT_C25519_PUBLIC_KEY_LEN]byte
	Nodes                           []*ZtWorldPlanetNode
}

type ZtNodeInetAddr struct {
	IP   *net.IP // net.IP == []byte
	Port uint16
}

func (a *ZtNodeInetAddr) Family() int {
	if a == nil || len(*a.IP) <= net.IPv4len {
		return syscall.AF_INET
	}
	if a.IP.To4() != nil {
		return syscall.AF_INET
	}
	return syscall.AF_INET6
}

func (a *ZtNodeInetAddr) FromString(ipport string) error {
	// endpoint address use specific format: <IPADDR>/<PORT>
	// identity address use contents from identity.public
	tIpPort := strings.Split(ipport, "/")
	if len(tIpPort) != 2 {
		return ErrInvalidData
	}
	tPort, err := strconv.ParseUint(tIpPort[1], 10, 16)
	if err != nil {
		return err
	}
	tIp := net.ParseIP(tIpPort[0])
	if tIp == nil {
		return ErrInvalidData
	}
	a.IP = &tIp
	a.Port = (uint16)(tPort)
	return nil
}

func (ztniaddr *ZtNodeInetAddr) Serialize() ([]byte, error) {
	var buf = make([]byte, 0)
	switch ztniaddr.Family() {
	case syscall.AF_INET:
		buf = append(buf, (uint8)(4))
		// uint32_t in_addr_t in_addr = sin_addr.s_addr (4bytes)
		buf = append(buf, ztniaddr.IP.To4()...)
		// in case we have port, append port. (reserved, but not used)
		// port -> ntoh conversion, net-byteorder is always big-endian
		buf = binary.BigEndian.AppendUint16(buf, ztniaddr.Port)
		return buf, nil
	case syscall.AF_INET6:
		buf = append(buf, (uint8)(6))
		// uint32_t in_addr_t in_addr = sin_addr.s_addr (4bytes)
		buf = append(buf, ztniaddr.IP.To16()...)
		// in case we have port, append port. (reserved, but not used)
		// port -> ntoh conversion, net-byteorder is always big-endian
		buf = binary.BigEndian.AppendUint16(buf, ztniaddr.Port)
		return buf, nil
	default:
		buf = []byte{0}
		return buf, ErrInvalidData
	}
}

type ZtWorldPlanetNodeIdentity = ZtNormalNode

func (ztpnid ZtWorldPlanetNodeIdentity) Serialize(inclPrivKey bool) ([]byte, error) {
	var buf = make([]byte, 0)
	buf = append(buf, ztpnid.ZtNodeAddress[:]...)
	buf = append(buf, 0)
	buf = append(buf, ztpnid.PublicKey[:]...)
	if ztpnid.HasPrivateKey() && inclPrivKey {
		buf = append(buf, ZT_C25519_PRIVATE_KEY_LEN)
		buf = append(buf, ztpnid.privateKey[:]...)
	} else {
		buf = append(buf, 0)
	}
	return buf, nil
}

type ZtWorldPlanetNode struct {
	Identity  *ZtWorldPlanetNodeIdentity
	Endpoints []*ZtNodeInetAddr
}

func (ztpn ZtWorldPlanetNode) Serialize() ([]byte, error) {
	var buf = make([]byte, 0)
	// node->identity.serialize(), then append
	idData, err := ztpn.Identity.Serialize(false)
	if err != nil {
		return nil, err
	}
	buf = append(buf, idData...)
	// node->endpoints.size()
	buf = append(buf, (uint8)(len(ztpn.Endpoints)))
	//    for each endpoint, endpoint.serialize(), then append
	for _, ep := range ztpn.Endpoints {
		epData, err := ep.Serialize()
		if err != nil {
			return nil, err
		}
		buf = append(buf, epData...)
	}
	// check if exceed limit then return result
	if len(ztpn.Endpoints) > ZT_WORLD_MAX_STABLE_ENDPOINTS_PER_ROOT {
		return nil, ErrMaxEndpointsExceeded
	}
	return buf, nil
}

func (ztw ZtWorld) Serialize(forSign bool, c25519sig [ZT_C25519_SIGNATURE_LEN]byte) ([]byte, error) {
	var buf = make([]byte, 0)
	// by default, forSign = false
	if forSign {
		buf = binary.BigEndian.AppendUint64(buf, 0x7f7f7f7f7f7f7f7f)
	}
	buf = append(buf, ztw.Type)
	buf = binary.BigEndian.AppendUint64(buf, ztw.ID)
	buf = binary.BigEndian.AppendUint64(buf, ztw.Timestamp)
	buf = append(buf, ztw.PublicKeyMustBeSignedByNextTime[:]...)
	// make sure sig is not 0
	if !forSign && !bytes.Equal(c25519sig[:4], []byte{0, 0, 0, 0}) {
		buf = append(buf, c25519sig[:]...)
	}
	buf = append(buf, (uint8)(len(ztw.Nodes)))
	if len(ztw.Nodes) > ZT_WORLD_MAX_ROOTS {
		return nil, ErrMaxRootsExceeded
	}
	for _, n := range ztw.Nodes {
		nBytes, err := n.Serialize()
		if err != nil {
			return nil, err
		}
		buf = append(buf, nBytes...)
	}
	if ztw.Type == ZT_WORLD_TYPE_MOON {
		// official comments: no attached dictionary (for future use)
		buf = binary.BigEndian.AppendUint16(buf, 0)
	}
	if forSign {
		buf = binary.BigEndian.AppendUint64(buf, 0xf7f7f7f7f7f7f7f7)
	}
	if len(buf) > ZT_WORLD_MAX_SERIALIZED_LENGTH {
		return nil, ErrSerializedDataTooLarge
	}
	return buf, nil
}
