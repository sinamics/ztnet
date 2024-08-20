/*
 *  SPDX-License-Identifier: AGPL-3.0-only
 *  Copyright (C) 2023 by kmahyyg in Patmeow Limited
 */

package ztcrypto

import (
	secrand "crypto/rand"
	"crypto/sha512"
	"encoding/binary"
	"golang.org/x/crypto/curve25519"
	"golang.org/x/crypto/ed25519"
	"golang.org/x/crypto/salsa20/salsa"
)

const ztIdentityGenMemory = 2097152

func ComputeZeroTierIdentityMemoryHardHash(publicKey []byte) []byte {
	s512 := sha512.Sum512(publicKey)

	var genmem [ztIdentityGenMemory]byte
	var s20key [32]byte
	var s20ctr [16]byte
	var s20ctri uint64
	copy(s20key[:], s512[0:32])
	copy(s20ctr[0:8], s512[32:40])
	salsa.XORKeyStream(genmem[0:64], genmem[0:64], &s20ctr, &s20key)
	s20ctri++
	for i := 64; i < ztIdentityGenMemory; i += 64 {
		binary.LittleEndian.PutUint64(s20ctr[8:16], s20ctri)
		salsa.XORKeyStream(genmem[i:i+64], genmem[i-64:i], &s20ctr, &s20key)
		s20ctri++
	}

	var tmp [8]byte
	for i := 0; i < ztIdentityGenMemory; {
		idx1 := uint(binary.BigEndian.Uint64(genmem[i:])&7) * 8
		i += 8
		idx2 := (uint(binary.BigEndian.Uint64(genmem[i:])) % uint(ztIdentityGenMemory/8)) * 8
		i += 8
		gm := genmem[idx2 : idx2+8]
		d := s512[idx1 : idx1+8]
		copy(tmp[:], gm)
		copy(gm, d)
		copy(d, tmp[:])
		binary.LittleEndian.PutUint64(s20ctr[8:16], s20ctri)
		salsa.XORKeyStream(s512[:], s512[:], &s20ctr, &s20key)
		s20ctri++
	}

	return s512[:]
}

// GenerateDualPair generates a key pair containing two pairs: one for curve25519 and one for ed25519.
func GenerateDualPair() (pub [64]byte, priv [64]byte) {
	k0pub, k0priv, _ := ed25519.GenerateKey(secrand.Reader)
	var k1pub, k1priv [32]byte
	secrand.Read(k1priv[:])
	curve25519.ScalarBaseMult(&k1pub, &k1priv)
	// https://www.eiken.dev/blog/2020/11/code-spotlight-the-reference-implementation-of-ed25519-part-1/
	// First 32 bytes of pub and priv are the keys for ECDH key
	// agreement. This generates the public portion from the private.
	copy(pub[0:32], k1pub[:])
	copy(priv[0:32], k1priv[:])
	// Second 32 bytes of pub and priv are the keys for ed25519
	// signing and verification.
	copy(pub[32:64], k0pub[0:32])
	copy(priv[32:64], k0priv[0:32])
	// same as node/C25519.cpp
	return
}

func SignMessage(pub [64]byte, priv [64]byte, msg []byte) ([96]byte, error) {
	var sigBuf = make([]byte, 96)
	var finalSig = [96]byte{}
	// Zerotier Official: we sign the first 32 bytes of SHA-512(msg)
	h := sha512.New()
	h.Write(msg)
	s512 := h.Sum(nil)
	copy(sigBuf[64:], s512[:32])
	//
	// in fact, it's ed25519 sign.
	//
	/**
	 * This takes the SHA-512 of msg[] and then signs the first 32 bytes of this
	 * digest, returning it and the 64-byte ed25519 signature in signature[].
	 * This results in a signature that verifies both the signer's authenticity
	 * and the integrity of the message.
	 *
	 * This is based on the original ed25519 code from NaCl and the SUPERCOP
	 * cipher benchmark suite, but with the modification that it always
	 * produces a signature of fixed 96-byte length based on the hash of an
	 * arbitrary-length message.
	 *
	 */
	//
	// Signature = (R,S,Sha512-Of-First32-Msg)
	//
	goPrivK := make([]byte, 64)
	copy(goPrivK[:32], priv[32:64])
	copy(goPrivK[32:], pub[32:64])
	sigData := ed25519.Sign(goPrivK, s512[:32])
	copy(sigBuf[:64], sigData)
	// finalize and return
	copy(finalSig[:], sigBuf)
	return finalSig, nil
}
