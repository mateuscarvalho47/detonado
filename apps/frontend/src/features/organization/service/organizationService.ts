import { api } from "@/lib/api";
import type {
	GroupValues,
	MembershipValues,
} from "../schema/organizationSchema";
export interface PersonalGroup {
	id: string;
	name: string;
	createdAt: string;
	updatedAt: string;
}
export type GroupKind = "collections" | "tags";
export async function fetchOrganization() {
	const [collections, tags] = await Promise.all([
		api.get<{ collections: PersonalGroup[] }>("/library/collections"),
		api.get<{ tags: PersonalGroup[] }>("/library/tags"),
	]);
	return { ...collections, ...tags };
}
export function createGroup(kind: GroupKind, values: GroupValues) {
	return api.post<PersonalGroup>(`/library/${kind}`, values);
}
export function renameGroup(kind: GroupKind, id: string, values: GroupValues) {
	return api.patch<PersonalGroup>(`/library/${kind}/${id}`, values);
}
export function deleteGroup(kind: GroupKind, id: string) {
	return api.delete(`/library/${kind}/${id}`);
}
export function updateMembership(entryId: string, values: MembershipValues) {
	return api.patch<MembershipValues>(
		`/library/${entryId}/organization`,
		values,
	);
}
