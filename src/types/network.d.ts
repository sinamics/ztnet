import { type MemberEntity } from "./local/member";
import { type NetworkEntity } from "./local/network";
import { type FlattenCentralMembers } from "./central/members";
import { type FlattenCentralNetwork } from "./central/network";
export interface NetworkAndMemberResponse {
  network: NetworkEntity | FlattenCentralNetwork;
  members: Partial<MemberEntity[]> | Partial<FlattenCentralMembers[]>;
  zombieMembers?: MemberEntity[];
}
