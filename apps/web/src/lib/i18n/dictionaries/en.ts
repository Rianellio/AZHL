/**
 * Canonical English dictionary — the source of truth for every translation key in the app.
 * `az.ts` and `ru.ts` are typed against this file's key set (`satisfies Record<TranslationKey,
 * string>`), so a missing translation is a build-time TypeScript error, not a silent English
 * fallback. Keys are flat, dot-namespaced strings (e.g. "league.about.p1") rather than nested
 * objects — simpler to look up, diff, and keep the three files in sync.
 *
 * Values with `{placeholder}` segments are interpolated by `t()` in use-translation.ts.
 */
export const en = {
  // Navigation
  "nav.league": "League",
  "nav.teams": "Teams",
  "nav.schedule": "Schedule",
  "nav.standings": "Standings",
  "nav.stats": "Stats",
  "nav.news": "News",
  "nav.media": "Media",
  "nav.contacts": "Contacts",
  "nav.join": "Join AZHL",
  "nav.language": "Language",
  "nav.primaryLabel": "Primary",
  "nav.closeMenu": "Close menu",
  "nav.openMenu": "Open menu",

  // Schedule tab list
  "schedule.scheduleView": "Schedule view",

  // Footer
  "footer.tagline":
    "AZHL is the premier ice hockey league in Azerbaijan. Our mission is to develop hockey and unite fans.",
  "footer.league": "League",
  "footer.information": "Information",
  "footer.followUs": "Follow Us",
  "footer.aboutAzhl": "About AZHL",
  "footer.players": "Players",
  "footer.partners": "Partners",
  "footer.copyright": "© {year} AZHL. All rights reserved.",

  // Shared / common
  "common.viewAll": "View all",
  "common.viewFullTable": "View full table",
  "common.viewTeam": "View Team",
  "common.readMore": "Read more",
  "common.team": "Team",
  "common.allTeams": "All teams",
  "common.sortBy": "Sort by {label}",

  // Homepage
  "home.nextGames": "Next Games",
  "home.standings": "Standings",
  "home.topPlayers": "Top Players",
  "home.latestNews": "Latest News",
  "home.partners": "Partners",
  "home.noUpcomingGames": "No upcoming games scheduled.",
  "home.noArticles": "No articles published yet.",
  "home.noTopPlayers": "No player statistics available yet.",
  "home.heroTagline": "One League. One Goal.",
  "home.heroTitle": "Azerbaijan\nHockey League",
  "home.seasonSuffix": "Season",

  // League page
  "league.heroTagline": "Four clubs. One championship.",
  "league.heroEyebrow": "Azerbaijan Hockey League",
  "league.heroTitle": "The\nLeague",
  "league.aboutTitle": "About AZHL",
  "league.aboutP1":
    "AZHL (Azerbaijan Hockey League) is a hockey league created to develop and promote ice hockey in Azerbaijan.",
  "league.aboutP2":
    "We bring together players, teams, and fans, creating an organized competition system and opportunities for hockey development at different levels, from youth and junior hockey to adult competition.",
  "league.aboutP3":
    "Our goal is to develop hockey teams, organize regular championships, and build a strong hockey community in Azerbaijan.",
  "league.competitionFormat": "Competition Format",
  "league.format4Teams": "4 Teams",
  "league.format4TeamsDesc": "Four clubs, one venue: every match is played in Baku at the Heydar Aliyev Sports and Concert Complex.",
  "league.formatRegularSeason": "Regular Season",
  "league.formatRegularSeasonDesc": "Each club plays 15 matches (30 in total). Three 20-minute periods, no overtime — a game tied after regulation goes to a shootout.",
  "league.formatPlayoffs": "Playoffs",
  "league.formatPlayoffsDesc": "All four clubs make the playoffs. Semifinals pair 1st vs 4th and 2nd vs 3rd, best of three (first to two wins).",
  "league.formatFinal": "Championship Final",
  "league.formatFinalDesc": "The semifinal winners meet in a best-of-five final (first to three wins) to crown the AZHL champion.",
  "league.teamsOverview": "Teams Overview",
  "league.viewAllTeams": "View all teams",
  "league.championshipTrophy": "Championship Trophy",
  "league.comingSoon": "Coming Soon",
  "league.trophyBlurb":
    "The AZHL Championship Trophy will be revealed ahead of the league's first Championship Final.",

  // Team detail page
  "teamDetail.rosterByPosition": "Roster by Position",
  "teamDetail.fullSquad": "Full Squad",
  "teamDetail.teamStatistics": "Team Statistics",
  "teamDetail.fullStandings": "Full standings",
  "teamDetail.rosterNotAnnounced": "Roster not yet announced.",
  "teamDetail.standingsWillAppear": "Standings will appear once the season begins.",
  "teamDetail.rank": "Rank",
  "teamDetail.gfga": "GF / GA",
  "teamDetail.teamLeaders": "Team Leaders",

  // Full squad groups + table
  "fullSquad.goalkeepers": "Goalkeepers",
  "fullSquad.defensemen": "Defensemen",
  "fullSquad.forwards": "Forwards",
  "fullSquad.colNum": "#",
  "fullSquad.colPos": "Pos",
  "fullSquad.colPlayer": "Player",

  // Players list page
  "players.title": "Players",
  "players.subtitle": "Every roster across the league.",
  "players.empty": "No players announced yet.",

  // Player detail page
  "playerDetail.seasonStatistics": "Season Statistics",
  "playerDetail.careerStatistics": "Career Statistics",
  "playerDetail.achievements": "Achievements",
  "playerDetail.recentGames": "Recent Games",
  "playerDetail.goals": "Goals",
  "playerDetail.assists": "Assists",
  "playerDetail.points": "Points",
  "playerDetail.colSeason": "Season",
  "playerDetail.colTeam": "Team",
  "playerDetail.colG": "G",
  "playerDetail.colA": "A",
  "playerDetail.colPts": "PTS",
  "playerDetail.colDate": "Date",
  "playerDetail.colOpponent": "Opponent",
  "playerDetail.colResult": "Result",
  "playerDetail.vsHome": "vs {team}",
  "playerDetail.vsAway": "@ {team}",
  "playerDetail.resultWin": "W",
  "playerDetail.resultLoss": "L",
  "playerDetail.noPriorSeasons": "No prior seasons — this is the club's first AZHL season.",
  "playerDetail.noAchievements": "No achievements recorded yet.",
  "playerDetail.noGamesPlayed": "No games played yet this season.",
  "playerDetail.penaltyMinutes": "Penalty Minutes",
  "playerDetail.wins": "Wins",
  "playerDetail.losses": "Losses",
  "playerDetail.goalsAgainstAverage": "Goals Against Avg",
  "playerDetail.savePercentage": "Save Percentage",
  "playerDetail.shutouts": "Shutouts",
  "playerDetail.colPim": "PIM",
  "playerDetail.colGaa": "GAA",
  "playerDetail.colSvPct": "SV%",
  "playerDetail.colSo": "SO",

  // Schedule page
  "schedule.title": "Schedule",
  "schedule.seasonWord": "Season",
  "schedule.seasonSchedule": "Season Schedule",
  "schedule.subtitleSuffix": "upcoming games, results, and calendar view.",
  "schedule.upcomingGames": "Upcoming Games",
  "schedule.completedGames": "Completed Games",
  "schedule.calendar": "Calendar",
  "schedule.noUpcoming": "No upcoming games scheduled.",
  "schedule.noCompleted": "No completed games yet — the season hasn't started.",
  "schedule.gamesOn": "Games on {date}",
  "schedule.previousMonth": "Previous month",
  "schedule.nextMonth": "Next month",

  // Standings page
  "standings.title": "Standings",
  "standings.subtitle": "Sortable by any column. The season hasn't started yet, so every value is zero.",
  "standings.empty": "Standings will appear once the season begins.",
  "standings.colTeam": "Team",
  "standings.colGP": "GP",
  "standings.colW": "W",
  "standings.colSOW": "SOW",
  "standings.colSOL": "SOL",
  "standings.colL": "L",
  "standings.colGF": "GF",
  "standings.colGA": "GA",
  "standings.colDIFF": "DIFF",
  "standings.colPTS": "PTS",

  // Stats page
  "stats.title": "Statistics",
  "stats.subtitle":
    "League leaders across skaters, goaltenders, and teams. The season hasn't started yet, so there are no leaders to show.",
  "stats.players": "Players",
  "stats.teams": "Teams",
  "stats.goals": "Goals",
  "stats.assists": "Assists",
  "stats.points": "Points",
  "stats.goalies": "Goalies",
  "stats.goalsFor": "Goals For",
  "stats.goalsAgainst": "Goals Against",
  "stats.powerPlay": "Power Play",
  "stats.penaltyKill": "Penalty Kill",
  "stats.abbrPP": "PP%",
  "stats.abbrPK": "PK%",
  "stats.emptyGoals": "No goal leaders yet — the season hasn't started.",
  "stats.emptyAssists": "No assist leaders yet — the season hasn't started.",
  "stats.emptyPoints": "No point leaders yet — the season hasn't started.",
  "stats.emptyGoalies": "No goaltending leaders yet — the season hasn't started.",
  "stats.emptyGoalsFor": "No teams have scored yet — the season hasn't started.",
  "stats.emptyGoalsAgainst": "No goals against yet — the season hasn't started.",
  "stats.emptyPowerPlay": "Power play tracking isn't available yet.",
  "stats.emptyPenaltyKill": "Penalty kill tracking isn't available yet.",

  // News
  "news.title": "News",
  "news.subtitle": "The latest from around the league.",
  "news.empty": "No articles published yet.",

  // Contacts page
  "contacts.title": "Contact",
  "contacts.subtitle": "Get in touch with the AZHL league office.",
  "contacts.information": "Contact Information",
  "contacts.address": "Address",
  "contacts.email": "Email",
  "contacts.phone": "Phone",
  "contacts.socialMedia": "Follow Us",
  "contacts.openInGoogleMaps": "Open in Google Maps",
  "contacts.sendMessage": "Send a Message",
  "contacts.name": "Name",
  "contacts.subject": "Subject",
  "contacts.message": "Message",
  "contacts.sendButton": "Send Message",
  "contacts.sentConfirmation": "Your email app should now open with your message ready to send.",

  // Media page
  "media.title": "Media",
  "media.subtitle": "Follow AZHL",
  "media.description":
    "Follow the Azerbaijan Hockey League on Instagram for league updates, game-day content, team news, photos, videos, and announcements.",
  "media.followButton": "Follow Us",

  // Game Center
  "game.away": "Away",
  "game.home": "Home",
  "game.period": "Period",
  "game.timeTba": "Time TBA",
  "game.versus": "vs",
  "game.shootout": "Shootout",
  "game.shootoutAbbr": "SO",
  "game.periodScores": "Score by period",
  "game.colTotal": "T",
  "game.shots": "Shots on goal",

  // Game/game-card status labels
  "status.upcoming": "Upcoming",
  "status.live": "Live",
  "status.liveComingSoon": "Live (Coming Soon)",
  "status.final": "Final",
  "status.finished": "Finished",
  "status.postponed": "Postponed",
  "status.awaitingResult": "Awaiting result",

  // Player positions
  "position.center": "Center",
  "position.leftWing": "Left Wing",
  "position.rightWing": "Right Wing",
  "position.defense": "Defense",
  "position.goaltender": "Goaltender",
  "position.leftDefense": "Left Defense",
  "position.rightDefense": "Right Defense",

  // Player bio additions
  "playerDetail.bioAge": "Age",
  "playerDetail.bioPhysical": "Height / Weight",
  "playerDetail.bioShoots": "Shoots",
  "playerDetail.bioCitizenship": "Citizenship",
  "playerDetail.shootsLeft": "Left (L)",
  "playerDetail.shootsRight": "Right (R)",
  "playerDetail.badgeJunior": "Junior (U18)",
  "playerDetail.badgeVeteran": "Veteran",

  // Partners strip

  // 404 page
  "notFound.title": "Page not found",
  "notFound.description": "The page you're looking for doesn't exist.",
  "notFound.backHome": "Back to home",
  "error.title": "Something went wrong",
  "error.description": "We couldn't load this page. Please try again in a moment.",
  "error.retry": "Try again",
  "meta.description": "Standings, schedule, scores, and news for the Azerbaijan Hockey League.",
  "meta.contacts": "Contact",
  "meta.league": "League",
  "meta.media": "Media",
  "meta.news": "News",
  "meta.players": "Players",
  "meta.schedule": "Schedule",
  "meta.standings": "Standings",
  "meta.stats": "Statistics",
  "meta.teams": "Teams",
  "meta.game": "{away} vs {home}",
  "teams.title": "Teams",
  "teams.clubs.one": "{n} club",
  "teams.clubs.few": "{n} clubs",
  "teams.clubs.many": "{n} clubs",
  "teams.clubs.other": "{n} clubs",
  "teams.season": "Season {label}",
  "teams.rank": "Place",
  "teams.points": "Points",
  "teams.nextMatch": "Next match",
  "teams.roster": "Players",
  "teams.cardLabel": "Open the {team} team page",
} as const;

export type TranslationKey = keyof typeof en;
