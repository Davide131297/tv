package de.polittalkwatcher.app.data

import kotlinx.coroutines.test.runTest
import kotlinx.serialization.decodeFromString
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException
import retrofit2.Response

/**
 * Prüft das Zusammenspiel von Datenmodellen und Repository anhand echter Antworten der
 * Web-API (gespeichert unter src/test/resources/fixtures).
 */
class PolittalkRepositoryTest {

    private val api = FixtureApi()
    private val repository = PolittalkRepository(api)

    @Test
    fun `summary wird dekodiert und all wird nicht als Show-Filter gesendet`() = runTest {
        val summary = repository.summary("all", "2026")

        assertTrue(summary.totalAppearances > 0)
        assertTrue(summary.totalEpisodes > 0)
        assertNull(api.lastShow)
        assertEquals("2026", api.lastYear)
    }

    @Test
    fun `konkrete Sendung wird als Filter gesendet`() = runTest {
        repository.partyStats("Markus Lanz", "all")

        assertEquals("Markus Lanz", api.lastShow)
        assertEquals("all", api.lastYear)
    }

    @Test
    fun `party-stats und Themen werden dekodiert`() = runTest {
        val parties = repository.partyStats("all", "2026")
        val areas = repository.politicalAreas("all", "2026")

        assertTrue(parties.any { it.partyName == "CDU" })
        assertTrue(areas.all { it.areaLabel.isNotBlank() && it.count > 0 })
    }

    @Test
    fun `detailed-appearances liefert Eintraege und Gesamtzahl aus der Pagination`() = runTest {
        val (items, total) = repository.appearances("all", "2026", "  ", limit = 3, offset = 0)

        assertEquals(3, items.size)
        assertTrue(total >= items.size)
        assertNull("Leere Suche darf nicht gesendet werden", api.lastSearch)
    }

    @Test
    fun `Zeitverlauf wandelt dynamische Partei-Spalten in Serien um`() = runTest {
        val timeline = repository.partyTimeline("all", "2026")

        assertTrue(timeline.months.isNotEmpty())
        assertTrue(timeline.months.all { it.matches(Regex("\\d{4}-\\d{2}")) })
        timeline.series.forEach { assertEquals(timeline.months.size, it.values.size) }
        assertEquals(
            "Serien sind nach Gesamtzahl absteigend sortiert",
            timeline.series.map { it.total }.sortedDescending(),
            timeline.series.map { it.total },
        )
    }

    @Test
    fun `Sendungen und Statistik werden dekodiert`() = runTest {
        val episodes = repository.episodes("Markus Lanz", "2026")
        val stats = repository.episodeStatistics("Markus Lanz", "2026")

        assertTrue(episodes.isNotEmpty())
        assertTrue(episodes.all { it.politicians.size == it.politicianCount })
        assertTrue(stats.averagePoliticiansPerEpisode > 0.0)
    }

    @Test
    fun `Rankings und Einschaltquoten werden dekodiert`() = runTest {
        val rankings = repository.rankings("all", "2026")
        val ratings = repository.tvRatings()

        assertEquals("Lars Klingbeil", rankings.first().politicianName)
        assertTrue(ratings.summary.totalRatings > 0)
        assertTrue(ratings.ratings.isNotEmpty())
        assertTrue(ratings.politicianStats.isNotEmpty())
        assertTrue(ratings.partyStats.isNotEmpty())
    }

    @Test
    fun `Politiker-Profil zerlegt den Namen und kombiniert die Endpunkte`() = runTest {
        val profile = repository.politicianProfile("Alice Weidel")

        assertEquals("Alice", api.lastFirstName)
        assertEquals("Weidel", api.lastLastName)
        assertTrue(profile.recentAppearances.isNotEmpty())
        assertEquals(5, profile.perShow.size)
        assertTrue(profile.totalAppearances > 0)
    }

    @Test
    fun `mehrteilige Vornamen bleiben zusammen`() = runTest {
        repository.politicianProfile("Marie-Agnes Strack Zimmermann")

        assertEquals("Marie-Agnes Strack", api.lastFirstName)
        assertEquals("Zimmermann", api.lastLastName)
    }

    @Test
    fun `404 bei politician-details ergibt eine leere Liste statt eines Fehlers`() = runTest {
        api.politicianNotFound = true

        val profile = repository.politicianProfile("Niemand Unbekannt")

        assertTrue(profile.recentAppearances.isEmpty())
    }
}

/** Liefert die gespeicherten API-Antworten und merkt sich die zuletzt gesendeten Parameter. */
private class FixtureApi : PolittalkApi {
    var lastShow: String? = null
    var lastYear: String? = null
    var lastSearch: String? = null
    var lastFirstName: String? = null
    var lastLastName: String? = null
    var politicianNotFound = false

    private inline fun <reified T> fixture(name: String): T {
        val text = requireNotNull(javaClass.classLoader?.getResource("fixtures/$name")) { "Fixture $name fehlt" }.readText()
        return PolittalkJson.decodeFromString(text)
    }

    private fun remember(show: String?, year: String?) {
        lastShow = show
        lastYear = year
    }

    override suspend fun summary(show: String?, year: String?): ApiResponse<SummaryStats> {
        remember(show, year)
        return fixture("summary.json")
    }

    override suspend fun recent(limit: Int, show: String?): ApiResponse<List<Appearance>> =
        fixture("detailed-appearances.json")

    override suspend fun partyStats(show: String?, year: String?): ApiResponse<List<PartyStat>> {
        remember(show, year)
        return fixture("party-stats.json")
    }

    override suspend fun detailedAppearances(
        show: String?,
        year: String?,
        search: String?,
        limit: Int,
        offset: Int,
    ): DetailedAppearancesResponse {
        remember(show, year)
        lastSearch = search
        return fixture("detailed-appearances.json")
    }

    override suspend fun episodesWithPoliticians(show: String, year: String?): ApiResponse<List<Episode>> {
        remember(show, year)
        return fixture("episodes.json")
    }

    override suspend fun episodeStatistics(show: String, year: String?): ApiResponse<EpisodeStatistics> {
        remember(show, year)
        return fixture("episode-statistics.json")
    }

    override suspend fun politicianRankings(show: String?, year: String?, limit: Int): ApiResponse<List<PoliticianRanking>> {
        remember(show, year)
        return fixture("rankings.json")
    }

    override suspend fun politicalAreas(show: String?, year: String?): ApiResponse<List<PoliticalAreaStat>> {
        remember(show, year)
        return fixture("political-areas.json")
    }

    override suspend fun partyTimeline(show: String?, year: String?): PartyTimelineResponse {
        remember(show, year)
        return fixture("party-timeline.json")
    }

    override suspend fun politicianDetails(firstName: String, lastName: String): PoliticianDetailsResponse {
        lastFirstName = firstName
        lastLastName = lastName
        if (politicianNotFound) {
            throw HttpException(Response.error<Any>(404, """{"error":"Politician not found"}""".toResponseBody()))
        }
        return fixture("politician-details.json")
    }

    override suspend fun politicianComparison(first: String, second: String, year: String?): List<ComparisonRow> =
        fixture("comparison.json")

    override suspend fun tvRatings(): ApiResponse<TvRatingsDashboard> = fixture("tv-ratings.json")
}
