import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
	type RetrospectiveValues,
	retrospectiveSchema,
} from "../schema/retrospectiveSchema";
import { fetchRetrospective } from "../service/retrospectiveService";
export function useRetrospective() {
	const [period, setPeriod] = useState<RetrospectiveValues>(() => ({
		year: new Date().getFullYear(),
		month: "",
	}));
	const form = useForm<RetrospectiveValues>({
		resolver: zodResolver(retrospectiveSchema),
		defaultValues: period,
	});
	const query = useQuery({
		queryKey: ["retrospective", period.year, period.month || null],
		queryFn: () => fetchRetrospective(period.year, period.month || undefined),
		staleTime: 60000,
	});
	return { period, form, query, onSubmit: form.handleSubmit(setPeriod) };
}
