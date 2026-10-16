package de.polittalkwatcher.app.data

import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import retrofit2.HttpException

/** Monatliche Partei-Auftritte, aufbereitet für das Liniendiagramm. */
data class PartyTimeline(
    val months: List<String>,
    val series: List<TimelineSeries>,
)

data class TimelineSeries(val party: String, val values: List<Int>) {
    val total: Int get() = values.sum()
}

/** Profil eines Politikers für die Detailseite. */
data class PoliticianProfile(
    /** Letzte Auftritte (max. 20) mit korrekt zugeordneten Episoden-Links. */
    val recentAppearances: List<PoliticianShowAppearance>,
    /** Gesamtzahl aller erfassten Auftritte. */
    val totalAppearances: Int,
    /** Auftritte je Leitformat (Lanz, Illner, Miosga, Maischberger, Hart aber fair). */
    val perShow: List<ComparisonRow>,
    val abgeordnetenwatchUrl: String?,
)

/**
 * Zentrale Datenquelle der App. Übersetzt die UI-Filter in die Query-Parameter
 * der Web-API ("all" bzw. leere Werte werden weggelassen, wie im Web-Frontend).
 */
class PolittalkRepository(private val api: PolittalkApi) {

    suspend fun summary(show: String, year: String): SummaryStats =
        api.summary(show.asShowParam(), year).data

    suspend fun recentAppearances(limit: Int = 8): List<Appearance> =
        api.recent(limit).data

    suspend fun partyStats(show: String, year: String): List<PartyStat> =
        api.partyStats(show.asShowParam(), year).data

    suspend fun appearances(
        show: String,
        year: String,
        search: String,
        limit: Int,
        offset: Int,
    ): Pair<List<Appearance>, Int> {
        val response = api.detailedAppearances(
            show = show.asShowParam(),
            year = year,
            search = search.trim().ifBlank { null },
            limit = limit,
            offset = offset,
        )
        return response.data to (response.pagination?.total?.count ?: response.data.size)
    }

    suspend fun episodes(show: String, year: String): List<Episode> =
        api.episodesWithPoliticians(show, year).data

    suspend fun episodeStatistics(show: String, year: String): EpisodeStatistics =
        api.episodeStatistics(show, year).data

    suspend fun rankings(show: String, year: String, limit: Int = 50): List<PoliticianRanking> =
        api.politicianRankings(show.asShowParam(), year, limit).data

    suspend fun politicalAreas(show: String, year: String): List<PoliticalAreaStat> =
        api.politicalAreas(show.asShowParam(), year).data

    suspend fun partyTimeline(show: String, year: String): PartyTimeline {
        val response = api.partyTimeline(show.asShowParam(), year)
        val months = response.data.map { row -> row["month"]?.jsonPrimitive?.content.orEmpty() }
        val series = response.parties.map { party ->
            TimelineSeries(
                party = party,
                values = response.data.map { row -> row[party]?.jsonPrimitive?.intOrNull ?: 0 },
            )
        }.sortedByDescending { it.total }
        return PartyTimeline(months, series)
    }

    /**
     * Lädt alles für die Detailseite parallel – dieselben Endpunkte, die auch das Web nutzt:
     * `politician-details` (Episoden-Links), `detailed-appearances` (Gesamtzahl, abgeordnetenwatch-Profil)
     * und `politician-comparison` (Auftritte je Sendung).
     */
    suspend fun politicianProfile(name: String): PoliticianProfile = coroutineScope {
        val parts = name.trim().split(Regex("\\s+"))
        val lastName = parts.last()
        val firstName = parts.dropLast(1).joinToString(" ").ifBlank { lastName }

        val recent = async {
            try {
                api.politicianDetails(firstName, lastName).data
            } catch (e: HttpException) {
                if (e.code() == 404) emptyList() else throw e
            }
        }
        val overview = async {
            api.detailedAppearances(show = null, year = "all", search = name, limit = 1, offset = 0)
        }
        val perShow = async { api.politicianComparison(name, name, null) }

        val overviewResult = overview.await()
        PoliticianProfile(
            recentAppearances = recent.await(),
            totalAppearances = overviewResult.pagination?.total?.count ?: 0,
            perShow = perShow.await(),
            abgeordnetenwatchUrl = overviewResult.data.firstOrNull()?.abgeordnetenwatchUrl,
        )
    }

    suspend fun compare(first: String, second: String, year: String): List<ComparisonRow> =
        api.politicianComparison(first, second, year)

    suspend fun tvRatings(): TvRatingsDashboard = api.tvRatings().data

    private fun String.asShowParam(): String? = takeUnless { it.isBlank() || it == ALL }

    companion object {
        const val ALL = "all"
    }
}
