/*
 *  SPDX-License-Identifier: AGPL-3.0-only
 *  Copyright (C) 2023 by kmahyyg in Patmeow Limited
 */

package node

import "errors"

var (
	ErrMaxEndpointsExceeded   = errors.New("zerotier node has too many endpoints")
	ErrMaxRootsExceeded       = errors.New("zerotier root exceeds limits")
	ErrSerializedDataTooLarge = errors.New("serialized data longer than restriction")
	ErrInvalidData            = errors.New("data input invalid")
	ErrUnknown                = errors.New("unknown error")
)
