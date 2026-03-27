'use client';

import { useMemo } from 'react';
import { useApp } from '@/app/lib/store';
import { PERSONALITIES, PERSONALITY_INFO } from '@/app/lib/data';
import { PersonalityRadar } from '@/components/PersonalityRadar';

const EMPTY_VECTOR: [number, number, number, number, number] = [0.2, 0.2, 0.2, 0.2, 0.2];

export default function GraphPage() {
	const { personality, observations, bookings } = useApp();

	const vector = personality?.vector ?? EMPTY_VECTOR;
	const dominant = personality?.dominant ?? 'Explorer';

	const ranked = useMemo(() => {
		return PERSONALITIES
			.map((name, i) => ({
				name,
				value: vector[i],
				color: PERSONALITY_INFO[name].color,
				emoji: PERSONALITY_INFO[name].emoji,
			}))
			.sort((a, b) => b.value - a.value);
	}, [vector]);

	return (
		<main className="min-h-screen bg-[#E5E9DF] px-4 py-4 sm:px-6 sm:py-8 lg:px-12">
			<section className="mx-auto w-full max-w-6xl">
				<div className="mb-6 sm:mb-8">
					<h1 className="font-display text-3xl sm:text-4xl tracking-tight text-[#1A2E1C] lg:text-5xl">Your Travel Graph</h1>
					<p className="mt-2 text-[#1A2E1C]/70">
						A visual breakdown of your current personality signal from onboarding observations.
					</p>
				</div>

				<div className="grid gap-4 sm:gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
					<div className="rounded-2xl sm:rounded-3xl border border-black/5 bg-white/70 p-4 sm:p-6 shadow-sm">
						<div className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0B6E2A]">Radar</div>
						<div className="flex justify-center">
							<PersonalityRadar vector={vector} size={280} />
						</div>
						<p className="mt-4 text-center text-sm text-[#1A2E1C]/70">
							Dominant profile: <span className="font-semibold text-[#1A2E1C]">{dominant}</span>
						</p>
					</div>

					<div className="rounded-2xl sm:rounded-3xl border border-black/5 bg-white/70 p-4 sm:p-6 shadow-sm">
						<div className="mb-4 text-sm font-semibold uppercase tracking-wider text-[#0B6E2A]">Signal Weights</div>
						<div className="space-y-4">
							{ranked.map((row) => (
								<div key={row.name}>
									<div className="mb-1 flex items-center justify-between text-sm">
										<span className="font-medium text-[#1A2E1C]">
											{row.emoji} {row.name}
										</span>
										<span className="text-[#1A2E1C]/70">{Math.round(row.value * 100)}%</span>
									</div>
									<div className="h-2.5 overflow-hidden rounded-full bg-[#D6DCCD]">
										<div
											className="h-full rounded-full transition-all"
											style={{ width: `${Math.max(2, row.value * 100)}%`, backgroundColor: row.color }}
										/>
									</div>
								</div>
							))}
						</div>

						<div className="mt-6 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-4">
							<div className="rounded-2xl bg-[#E5E9DF] p-4">
								<div className="text-xs uppercase tracking-wider text-[#1A2E1C]/60">Observations</div>
								<div className="mt-1 text-2xl font-semibold text-[#1A2E1C]">{observations.length}</div>
							</div>
							<div className="rounded-2xl bg-[#E5E9DF] p-4">
								<div className="text-xs uppercase tracking-wider text-[#1A2E1C]/60">Bookings</div>
								<div className="mt-1 text-2xl font-semibold text-[#1A2E1C]">{bookings.length}</div>
							</div>
						</div>
					</div>
				</div>
			</section>
		</main>
	);
}
