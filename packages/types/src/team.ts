export interface TeamColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface TeamDTO {
  id: string;
  name: string;
  city: string;
  slug: string;
  abbreviation: string;
  colors: TeamColors;
  logoUrl: string | null;
}

export interface TeamSummaryDTO extends Pick<TeamDTO, "id" | "name" | "slug" | "abbreviation" | "colors" | "logoUrl"> {}
