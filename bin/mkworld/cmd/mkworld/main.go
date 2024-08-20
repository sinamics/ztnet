package main

import (
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"os"
	"time"
	"ztnodeid/pkg/node"
	"ztnodeid/pkg/ztcrypto"
)

var (
	ErrWorldSigningKeyIllegal = errors.New("world signing key current.c25519 / previous.c25519 is illegal")
	ErrPreflightCheckFailed   = errors.New("preflight check failed, internal requirement cannot be satisfied")
	errUseRecommendValue      = errors.New("potential risk of failed execution, use recommendation if possible")
)

var (
	prevkp     = make([]byte, node.ZT_C25519_PUBLIC_KEY_LEN+node.ZT_C25519_PRIVATE_KEY_LEN)
	curkp      = make([]byte, node.ZT_C25519_PUBLIC_KEY_LEN+node.ZT_C25519_PRIVATE_KEY_LEN)
	mConf      = &MkWorldConfig{}
	gConfFile  = flag.String("c", "mkworld.config.json", "program config")
	alreadyMod = false
)

func init() {
	flag.Parse()
	log.Println("startup flag parsed: ", flag.Parsed())
}

func main() {
	/**
	// current.c25519: public key 64 bytes, private key 64 bytes
	// signature: must be signed by previous,
	// message is world after serialized, internal public key is current
	// if initial, previous=current
	// elliptic curve crypt operation are copied from NaCl
	**/
	// Now Start Preflight Check
	// Check Config Number limit and legal or not
	if err := Preflight(); err != nil {
		switch err {
		case ErrPreflightCheckFailed:
			panic(err)
		case errUseRecommendValue:
			log.Println("!You've been warned! WARN! WARN! WARN!")
			if mConf.PlanetRecommend {
				log.Println("since you've set plRecommend to true, we will automatically choose a new value.")
				log.Println("which might be much suitable for you.")
				mConf.PlanetID = (uint64)(rand.Uint32())
				mConf.PlanetBirth = (uint64)(time.Now().UnixMilli())
				log.Printf("Generated Planet ID: %d, Birth TimeStamp: %d . \n", mConf.PlanetID, mConf.PlanetBirth)
				alreadyMod = true
			} else {
				log.Println("planet ID and planet birth might not be suitable for unofficial world. unexpected things might happen.")
			}
		default:
			log.Println("unknown error occured, preflight check failed.")
			panic(err)
		}
		log.Println("!You've been warned! WARN! WARN! WARN!")
	}
	// check signing key
	if err := PreFlightSigningKeyCheck(); err != nil {
		// if signing key is illegal, generate new
		switch err {
		case ErrWorldSigningKeyIllegal:
			log.Println("preflight check error occurred, but still can proceed.")
			pub1, priv1 := ztcrypto.GenerateDualPair()
			copy(prevkp[:node.ZT_C25519_PUBLIC_KEY_LEN], pub1[:])
			copy(prevkp[node.ZT_C25519_PUBLIC_KEY_LEN:], priv1[:])
			copy(curkp, prevkp)
			err = os.WriteFile("current.c25519", prevkp, 0640)
			if err != nil {
				log.Println("failed to write generate c25519 key pair to disk.")
				panic(err)
			}
			err = os.WriteFile("previous.c25519", curkp, 0640)
			if err != nil {
				log.Println("failed to write generate c25519 key pair to disk.")
				panic(err)
			}
			log.Println("new world signing key generated.")
		default:
			log.Println("preflight check failed.")
			// else panic
			panic(err)
		}
	}
	log.Println("preflight check successfully complete.")
	// Preflight check successfully completed
	// Start to build a world
	ztW := &node.ZtWorld{
		Type:      node.ZT_WORLD_TYPE_PLANET,
		ID:        mConf.PlanetID,
		Timestamp: mConf.PlanetBirth,
	}
	// fill the node
	var err2 error
	ztW.Nodes, err2 = buildPlanetNodeFromConfig()
	if err2 != nil {
		panic(err2)
	}

	// prepare for signing
	var futurePubK = [node.ZT_C25519_PUBLIC_KEY_LEN]byte{}
	copy(futurePubK[:], curkp[:node.ZT_C25519_PUBLIC_KEY_LEN])
	ztW.PublicKeyMustBeSignedByNextTime = futurePubK
	log.Println("generating pre-sign message.")
	toSignZtW, err := ztW.Serialize(true, [node.ZT_C25519_SIGNATURE_LEN]byte{})
	if err != nil {
		panic(err)
	}
	log.Println("pre-sign world generated and serialized successfully.")

	var sigPubK [node.ZT_C25519_PUBLIC_KEY_LEN]byte
	var sigPrivK [node.ZT_C25519_PRIVATE_KEY_LEN]byte
	copy(sigPubK[:], prevkp[:node.ZT_C25519_PUBLIC_KEY_LEN])
	copy(sigPrivK[:], prevkp[node.ZT_C25519_PUBLIC_KEY_LEN:])

	sig4NewWorld, err := ztcrypto.SignMessage(sigPubK, sigPrivK, toSignZtW)
	if err != nil {
		panic(err)
	}
	log.Println("world has been signed.")

	// pack and serialize
	finalWorld, err := ztW.Serialize(false, sig4NewWorld)
	if err != nil {
		panic(err)
	}
	log.Println("new signed world are packed.")
	err = os.WriteFile(mConf.OutputFile, finalWorld, 0644)
	if err != nil {
		panic(err)
	}
	log.Println("packed new signed world has been written to file.")
	log.Println(" ")

	// if params are recommended, save
	if alreadyMod {
		mDt, err := json.Marshal(mConf)
		if err != nil {
			log.Println("err when trying to save modified mkworld json, err: ", err)
		} else {
			err2 := os.WriteFile("mkworld.new.json", mDt, 0644)
			if err2 != nil {
				log.Println("write file to disk failed, err:", err2)
			}
			log.Println("write modified json successfully.")
		}
	}
	log.Println(" ")

	// get c output
	log.Println("now c language output: ")
	fmt.Println(" ")
	fmt.Println("#define ZT_DEFAULT_WORLD_LENGTH ", len(finalWorld))
	fmt.Printf("static const unsigned char ZT_DEFAULT_WORLD[ZT_DEFAULT_WORLD_LENGTH] = {")
	for i, v := range finalWorld {
		if i > 0 {
			fmt.Printf(",")
		}
		fmt.Printf("0x%02x", v)
	}
	fmt.Printf("};\n")
	fmt.Println(" ")
}

type MkWorldConfig struct {
	SigningKeyFiles []string      `json:"signing"`
	OutputFile      string        `json:"output"`
	RootNodes       []MkWorldNode `json:"rootNodes"`
	PlanetID        uint64        `json:"plID"`
	PlanetBirth     uint64        `json:"plBirth"`
	PlanetRecommend bool          `json:"plRecommend"`
}

type MkWorldNode struct {
	Comments    string   `json:"comments,omitempty"`
	IdentityStr string   `json:"identity"`
	Endpoints   []string `json:"endpoints"`
}

func Preflight() error {
	gcfdata, err := os.ReadFile(*gConfFile)
	if err != nil {
		return err
	}
	log.Println("config file read.")
	err = json.Unmarshal(gcfdata, mConf)
	if err != nil {
		return err
	}
	log.Println("config file unmarshalled.")
	if len(mConf.SigningKeyFiles) != 2 {
		log.Println("signing key must have 2 files.")
		return ErrPreflightCheckFailed
	}
	if len(mConf.RootNodes) > node.ZT_WORLD_MAX_ROOTS {
		log.Println("root nodes are too many.")
		return ErrPreflightCheckFailed
	}
	for _, v := range mConf.RootNodes {
		if len(v.Endpoints) > node.ZT_WORLD_MAX_STABLE_ENDPOINTS_PER_ROOT {
			log.Println("stable endpoints for current root node are too many.")
			return ErrPreflightCheckFailed
		}
	}
	if mConf.PlanetID == node.ZT_WORLD_ID_EARTH || mConf.PlanetID == node.ZT_WORLD_ID_MARS || mConf.PlanetBirth == 1567191349589 {
		log.Println("!WARNING! You've specified a Planet ID / Birth that is currently in use.")
		return errUseRecommendValue
	}
	if mConf.PlanetBirth <= 1567191349589 {
		log.Println("!WARNING! You've been created a world older than official, timestamp should be larger than 1567191349589.")
		return errUseRecommendValue
	}
	return nil
}

func PreFlightSigningKeyCheck() error {
	var err1, err2 error
	// "signing": ["previous.c25519", "current.c25519"]
	tPrevkp, err1 := os.ReadFile(mConf.SigningKeyFiles[0])
	tCurkp, err2 := os.ReadFile(mConf.SigningKeyFiles[1])
	if err1 != nil || err2 != nil {
		log.Println("read world signing key failed: ", err1, " , ", err2)
		return ErrWorldSigningKeyIllegal
	}
	preqLen := node.ZT_C25519_PRIVATE_KEY_LEN + node.ZT_C25519_PUBLIC_KEY_LEN
	if len(prevkp) != preqLen || len(curkp) != preqLen {
		log.Println("existing world signing key does not satisfy required length.")
		return ErrWorldSigningKeyIllegal
	} else {
		curkp = tCurkp
		prevkp = tPrevkp
	}
	return nil
}

func buildPlanetNodeFromConfig() ([]*node.ZtWorldPlanetNode, error) {
	res := []*node.ZtWorldPlanetNode{}
	for _, v := range mConf.RootNodes {
		n1 := &node.ZtWorldPlanetNode{}
		n1ep := make([]*node.ZtNodeInetAddr, 0)
		n1id := &node.ZtWorldPlanetNodeIdentity{}
		err := n1id.FromString(v.IdentityStr, false)
		if err != nil {
			return nil, err
		}
		for _, v2 := range v.Endpoints {
			n1addr := &node.ZtNodeInetAddr{}
			err := n1addr.FromString(v2)
			if err != nil {
				return nil, err
			}
			n1ep = append(n1ep, n1addr)
		}
		n1.Identity = n1id
		n1.Endpoints = n1ep
		res = append(res, n1)
	}
	return res, nil
}
