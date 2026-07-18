export interface SeasonDTO {
  id: string;
  leagueId: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

export interface LeagueDTO {
  id: string;
  name: string;
  shortName: string;
  slug: string;
}
