/*
 *  SPDX-License-Identifier: AGPL-3.0-only
 *  Copyright (C) 2023 by kmahyyg in Patmeow Limited
 */

package node

import (
	"bytes"
	"encoding/hex"
	"fmt"
	"strings"
)

const (
	ZT_C25519_PUBLIC_KEY_LEN  = 64
	ZT_C25519_PRIVATE_KEY_LEN = 64
	ZT_C25519_SIGNATURE_LEN   = 96
)

type ZtNormalNode struct {
	ZtNodeAddress [5]byte // but only use big-endian high 40 bits
	PublicKey     [ZT_C25519_PUBLIC_KEY_LEN]byte
	privateKey    [ZT_C25519_PRIVATE_KEY_LEN]byte
}

// HasPrivateKey return true if first 4 bytes are all null
func (ztn ZtNormalNode) HasPrivateKey() bool {
	return !bytes.Equal(ztn.privateKey[0:4], []byte{0, 0, 0, 0})
}

// ExposePrivateKey returns internal private key
func (ztn ZtNormalNode) ExposePrivateKey() []byte {
	return ztn.privateKey[:]
}

// FromString import node identity using "identity.public", to use content of "identity.secret" with private key
// imported at the same time, set hasPrivateKey to true
func (ztn *ZtNormalNode) FromString(data string, hasPrivateKey bool) (err error) {
	tmpDt := strings.Split(data, ":")
	if len(tmpDt) != 3 && hasPrivateKey {
		return ErrInvalidData
	}
	if len(tmpDt) < 2 {
		return ErrInvalidData
	}
	if hasPrivateKey {
		tmpPrivk, err := hex.DecodeString(tmpDt[2])
		if err != nil {
			return err
		}
		copy(ztn.privateKey[:], tmpPrivk)
	}
	tmpAddr, err := hex.DecodeString(tmpDt[0])
	if err != nil {
		return err
	}
	copy(ztn.ZtNodeAddress[:], tmpAddr)
	tmpPubk, err := hex.DecodeString(tmpDt[2])
	if err != nil {
		return err
	}
	copy(ztn.PublicKey[:], tmpPubk)
	return nil
}

func (ztn ZtNormalNode) ToString(exportPrivateKey bool) string {
	// the second field, its value 0 indicates Curve25519/Ed25519 identity type
	pub := fmt.Sprintf("%02x:0:%02x", ztn.ZtNodeAddress, ztn.PublicKey)
	if exportPrivateKey && ztn.HasPrivateKey() {
		return pub + fmt.Sprintf(":%02x", ztn.privateKey)
	}
	return pub
}
