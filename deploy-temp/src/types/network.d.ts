import { type MemberEntity } from "./local/member";
import { type NetworkEntity } from "./local/network";
import { type FlattenCentralNetwork } from "./central/network";
export interface NetworkAndMemberResponse {
	network: NetworkEntity | FlattenCentralNetwork;
	members: Partial<MemberEntity[]>;
	zombieMembers?: MemberEntity[];
}
