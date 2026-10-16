package de.polittalkwatcher.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

/** Standard-Hülle der Next.js-API: `{ success, data, ... }`. */
@Serializable
data class ApiResponse<T>(
    val success: Boolean = true,
    val data: T,
    val total: Int? = null,
    val error: String? = null,
)

@Serializable
data class SummaryStats(
    @SerialName("total_appearances") val totalAppearances: Int = 0,
    @SerialName("total_episodes") val totalEpisodes: Int = 0,
    @SerialName("unique_politicians") val uniquePoliticians: Int = 0,
    @SerialName("parties_represented") val partiesRepresented: Int = 0,
    @SerialName("show_name") val showName: String? = null,
)

@Serializable
data class Appearance(
    @SerialName("show_name") val showName: String,
    @SerialName("episode_date") val episodeDate: String,
    @SerialName("politician_name") val politicianName: String,
    @SerialName("party_name") val partyName: String? = null,
    @SerialName("abgeordnetenwatch_url") val abgeordnetenwatchUrl: String? = null,
    @SerialName("episode_url") val episodeUrl: String? = null,
)

@Serializable
data class PartyStat(
    @SerialName("party_name") val partyName: String,
    val count: Int,
)

@Serializable
data class DetailedAppearancesResponse(
    val success: Boolean = true,
    val data: List<Appearance> = emptyList(),
    val pagination: Pagination? = null,
)

@Serializable
data class Pagination(
    val limit: Int = 0,
    val offset: Int = 0,
    val total: PaginationTotal? = null,
)

@Serializable
data class PaginationTotal(val count: Int = 0)

@Serializable
data class EpisodePolitician(
    val name: String,
    @SerialName("party_name") val partyName: String? = null,
)

@Serializable
data class Episode(
    @SerialName("episode_date") val episodeDate: String,
    @SerialName("politician_count") val politicianCount: Int = 0,
    @SerialName("episode_url") val episodeUrl: String? = null,
    val politicians: List<EpisodePolitician> = emptyList(),
)

@Serializable
data class EpisodeStatistics(
    @SerialName("total_episodes") val totalEpisodes: Int = 0,
    @SerialName("total_appearances") val totalAppearances: Int = 0,
    @SerialName("average_politicians_per_episode") val averagePoliticiansPerEpisode: Double = 0.0,
    @SerialName("max_politicians_in_episode") val maxPoliticiansInEpisode: Int = 0,
)

@Serializable
data class PoliticianRanking(
    @SerialName("politician_name") val politicianName: String,
    @SerialName("party_name") val partyName: String? = null,
    @SerialName("total_appearances") val totalAppearances: Int = 0,
    @SerialName("shows_appeared_on") val showsAppearedOn: Int = 0,
    @SerialName("show_names") val showNames: List<String> = emptyList(),
    @SerialName("latest_appearance") val latestAppearance: String? = null,
    @SerialName("first_appearance") val firstAppearance: String? = null,
)

@Serializable
data class PoliticalAreaStat(
    @SerialName("area_id") val areaId: Int,
    @SerialName("area_label") val areaLabel: String,
    val count: Int,
)

/** Antwort von `/api/v1/party-timeline`: Zeilen mit dynamischen Partei-Spalten. */
@Serializable
data class PartyTimelineResponse(
    val success: Boolean = true,
    val data: List<JsonObject> = emptyList(),
    val parties: List<String> = emptyList(),
    val year: String? = null,
)

@Serializable
data class PoliticianShowAppearance(
    val id: String? = null,
    @SerialName("show_name") val showName: String,
    @SerialName("episode_date") val episodeDate: String,
    @SerialName("episode_url") val episodeUrl: String? = null,
)

@Serializable
data class PoliticianDetailsResponse(
    val success: Boolean = false,
    val data: List<PoliticianShowAppearance> = emptyList(),
    val count: Int = 0,
    val error: String? = null,
)

/** Eine Zeile aus `/api/politician-comparison`: Auftritte von A und B je Sendung. */
@Serializable
data class ComparisonRow(
    val show: String,
    @SerialName("A") val a: Int = 0,
    @SerialName("B") val b: Int = 0,
)

@Serializable
data class TvRatingsDashboard(
    val summary: TvRatingsSummary = TvRatingsSummary(),
    val ratings: List<TvRating> = emptyList(),
    val politicianStats: List<PoliticianTvStat> = emptyList(),
    val partyStats: List<PartyTvStat> = emptyList(),
)

@Serializable
data class TvRatingsSummary(
    @SerialName("total_ratings") val totalRatings: Int = 0,
    @SerialName("total_viewers_millions") val totalViewersMillions: Double = 0.0,
    @SerialName("average_market_share") val averageMarketShare: Double = 0.0,
    @SerialName("average_viewers_millions") val averageViewersMillions: Double = 0.0,
)

@Serializable
data class TvRating(
    @SerialName("show_name") val showName: String,
    @SerialName("episode_date") val episodeDate: String,
    @SerialName("market_share") val marketShare: Double = 0.0,
    @SerialName("viewers_millions") val viewersMillions: Double = 0.0,
    @SerialName("episode_url") val episodeUrl: String? = null,
    val politicians: List<EpisodePolitician> = emptyList(),
)

@Serializable
data class PoliticianTvStat(
    @SerialName("politician_name") val politicianName: String,
    @SerialName("party_name") val partyName: String? = null,
    val appearances: Int = 0,
    @SerialName("total_viewers_millions") val totalViewersMillions: Double = 0.0,
    @SerialName("average_viewers_millions") val averageViewersMillions: Double = 0.0,
    @SerialName("average_market_share") val averageMarketShare: Double = 0.0,
    @SerialName("latest_episode") val latestEpisode: String? = null,
)

@Serializable
data class PartyTvStat(
    @SerialName("party_name") val partyName: String,
    @SerialName("rated_episodes") val ratedEpisodes: Int = 0,
    @SerialName("total_viewers_millions") val totalViewersMillions: Double = 0.0,
    @SerialName("average_viewers_millions") val averageViewersMillions: Double = 0.0,
    @SerialName("average_market_share") val averageMarketShare: Double = 0.0,
    @SerialName("latest_episode") val latestEpisode: String? = null,
)
