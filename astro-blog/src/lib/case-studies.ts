import { getEmDashCollection, getEmDashEntry } from 'emdash';

export async function listCaseStudies() {
	const { entries, error } = await getEmDashCollection('case_studies', {
		orderBy: { published_on: 'desc' },
	});
	if (error) throw error;
	return entries.sort((a, b) => {
		const byDate = dateOf(b).valueOf() - dateOf(a).valueOf();
		if (byDate !== 0) return byDate;
		return a.id === 'reset' ? -1 : 1;
	});
}

export async function readCaseStudy(slug: string) {
	const { entry, error } = await getEmDashEntry('case_studies', slug);
	if (error) throw error;
	return entry;
}

export function dateOf(entry: { data: { published_on?: string | Date } }) {
	const value = entry.data.published_on;
	return value instanceof Date ? value : new Date(value ?? 0);
}
