// Copyright (c) 2021, ZeroTier, Inc.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this
//    list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice,
//    this list of conditions and the following disclaimer in the documentation
//    and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived from
//    this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
// OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

package node

/**
 * A ZeroTier identity
 *
 * An identity consists of a public key, a 40-bit ZeroTier address computed
 * from that key in a collision-resistant fashion, and a self-signature.
 *
 * The address derivation algorithm makes it computationally very expensive to
 * search for a different public key that duplicates an existing address. (See
 * code for deriveAddress() for this algorithm.)
 */

import (
	"fmt"
	"ztnodeid/pkg/ztcrypto"
)

const ztIdentityHashCashFirstByteLessThan = 17

// ZeroTierIdentity contains a public key, a private key, and a string representation of the identity.
type ZeroTierIdentity struct {
	address    uint64 // ZeroTier address, only least significant 40 bits are used
	publicKey  [64]byte
	privateKey *[64]byte
}

// NewZeroTierIdentity creates a new ZeroTier Identity.
// This can be a little bit time-consuming due to one way proof of work requirements (usually a few hundred milliseconds).
func NewZeroTierIdentity() (id ZeroTierIdentity) {
	for {
		pub, priv := ztcrypto.GenerateDualPair()
		dig := ztcrypto.ComputeZeroTierIdentityMemoryHardHash(pub[:])
		if dig[0] < ztIdentityHashCashFirstByteLessThan && dig[59] != 0xff {
			id.address = uint64(dig[59])
			id.address <<= 8
			id.address |= uint64(dig[60])
			id.address <<= 8
			id.address |= uint64(dig[61])
			id.address <<= 8
			id.address |= uint64(dig[62])
			id.address <<= 8
			id.address |= uint64(dig[63])
			if id.address != 0 {
				id.publicKey = pub
				id.privateKey = &priv
				break
			}
		}
	}
	return
}

// PrivateKeyString returns the full identity.secret if the private key is set, or an empty string if no private key is set.
func (id *ZeroTierIdentity) PrivateKeyString() string {
	if id.privateKey != nil {
		s := fmt.Sprintf("%.10x:0:%x:%x", id.address, id.publicKey, *id.privateKey)
		return s
	}
	return ""
}

// PublicKeyString returns identity.public contents.
func (id *ZeroTierIdentity) PublicKeyString() string {
	s := fmt.Sprintf("%.10x:0:%x", id.address, id.publicKey)
	return s
}

// IDString returns the NodeID as a 10-digit hex string
func (id *ZeroTierIdentity) IDString() string {
	s := fmt.Sprintf("%.10x", id.address)
	return s
}

// ID returns the ZeroTier address as a uint64
func (id *ZeroTierIdentity) ID() uint64 {
	return id.address
}

// PrivateKey returns the bytes of the private key (or nil if not set)
func (id *ZeroTierIdentity) PrivateKey() *[64]byte {
	return id.privateKey
}

// PublicKey returns the public key bytes
func (id *ZeroTierIdentity) PublicKey() [64]byte {
	return id.publicKey
}
