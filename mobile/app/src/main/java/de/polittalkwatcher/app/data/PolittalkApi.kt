package de.polittalkwatcher.app.data

import retrofit2.http.GET
import retrofit2.http.Query

/**
 * Die öffentlichen Endpunkte des Next.js-Backends (siehe frontend/PUBLIC_API.md),
 * die auch das Web-Frontend nutzt. Alle Endpunkte sind read-only und ohne API-Key erreichbar.
 *
 * Filter-Konventionen wie im Web: `show = null` bzw. "all" = alle Sendungen,
 * `year = "all"` = alle Jahre.
 */
interface PolittalkApi {

    @GET("api/v1/politics?type=summary")
    suspend fun summary(
        @Query("show") show: String?,
        @Query("year") year: String?,
    ): ApiResponse<SummaryStats>

    @GET("api/v1/politics?type=recent")
    suspend fun recent(
        @Query("limit") limit: Int,
        @Query("show") show: String? = null,
    ): ApiResponse<List<Appearance>>

    @GET("api/v1/politics?type=party-stats")
    suspend fun partyStats(
        @Query("show") show: String?,
        @Query("year") year: String?,
    ): ApiResponse<List<PartyStat>>

    @GET("api/v1/politics?type=detailed-appearances")
    suspend fun detailedAppearances(
        @Query("show") show: String?,
        @Query("year") year: String?,
        @Query("search") search: String?,
        @Query("limit") limit: Int,
        @Query("offset") offset: Int,
    ): DetailedAppearancesResponse

    @GET("api/v1/politics?type=episodes-with-politicians")
    suspend fun episodesWithPoliticians(
        @Query("show") show: String,
        @Query("year") year: String?,
    ): ApiResponse<List<Episode>>

    @GET("api/v1/politics?type=episode-statistics")
    suspend fun episodeStatistics(
        @Query("show") show: String,
        @Query("year") year: String?,
    ): ApiResponse<EpisodeStatistics>

    @GET("api/v1/politics?type=politician-rankings")
    suspend fun politicianRankings(
        @Query("show") show: String?,
        @Query("year") year: String?,
        @Query("limit") limit: Int,
    ): ApiResponse<List<PoliticianRanking>>

    @GET("api/v1/political-areas")
    suspend fun politicalAreas(
        @Query("show") show: String?,
        @Query("year") year: String?,
    ): ApiResponse<List<PoliticalAreaStat>>

    @GET("api/v1/party-timeline")
    suspend fun partyTimeline(
        @Query("show") show: String?,
        @Query("year") year: String?,
    ): PartyTimelineResponse

    @GET("api/v1/politician-details")
    suspend fun politicianDetails(
        @Query("first_name") firstName: String,
        @Query("last_name") lastName: String,
    ): PoliticianDetailsResponse

    @GET("api/politician-comparison")
    suspend fun politicianComparison(
        @Query("p1") first: String,
        @Query("p2") second: String,
        @Query("year") year: String?,
    ): List<ComparisonRow>

    @GET("api/tv-ratings")
    suspend fun tvRatings(): ApiResponse<TvRatingsDashboard>
}
