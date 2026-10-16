package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.polittalkwatcher.app.data.PartyStat
import de.polittalkwatcher.app.data.PartyTimeline
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.ui.ALL_YEARS
import de.polittalkwatcher.app.ui.FilteredViewModel
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.ChartDatum
import de.polittalkwatcher.app.ui.components.DonutChart
import de.polittalkwatcher.app.ui.components.EmptyView
import de.polittalkwatcher.app.ui.components.FilterBar
import de.polittalkwatcher.app.ui.components.HorizontalBarChart
import de.polittalkwatcher.app.ui.components.LegendItem
import de.polittalkwatcher.app.ui.components.LineChart
import de.polittalkwatcher.app.ui.components.LineSeries
import de.polittalkwatcher.app.ui.components.PageIntro
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.StateContent
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.formatMonth
import de.polittalkwatcher.app.ui.partyColor
import de.polittalkwatcher.app.ui.partyShortName
import de.polittalkwatcher.app.ui.percent
import de.polittalkwatcher.app.ui.theme.LocalDarkTheme

class PartyStatsViewModel(private val repository: PolittalkRepository) : FilteredViewModel<List<PartyStat>>() {
    init {
        load()
    }

    override suspend fun fetch(show: String, year: String) = repository.partyStats(show, year)
}

class PartyTimelineViewModel(private val repository: PolittalkRepository) : FilteredViewModel<PartyTimeline>() {
    init {
        load()
    }

    override suspend fun fetch(show: String, year: String) = repository.partyTimeline(show, year)
}

/** Parteien – Web: `/parteien` und `/parteien-zeitverlauf` als Tabs (im Web ein Dropdown-Menü). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PartiesScreen(initialTab: Int) {
    var tab by rememberSaveable(initialTab) { mutableIntStateOf(initialTab) }
    ScreenScaffold(title = "Parteien") { padding ->
        Column(Modifier.padding(padding)) {
            PrimaryTabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Übersicht") }, unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Zeitverlauf") }, unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            when (tab) {
                0 -> PartyStatsTab()
                else -> PartyTimelineTab()
            }
        }
    }
}

@Composable
private fun PartyStatsTab() {
    val viewModel = appViewModel { PartyStatsViewModel(it) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    var unionMode by rememberSaveable { mutableStateOf(false) }
    var chartType by rememberSaveable { mutableIntStateOf(0) }
    val dark = LocalDarkTheme.current

    Refreshable(refreshing, viewModel::refresh) {
        LazyColumn(
            contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                PageIntro(
                    "Verteilung der Politiker-Auftritte nach Parteien in deutschen TV-Talkshows",
                    Modifier.padding(horizontal = 16.dp),
                )
            }
            item {
                FilterBar(show, year, viewModel::setShow, viewModel::setYear) {
                    FilterChip(
                        selected = unionMode,
                        onClick = { unionMode = !unionMode },
                        label = { Text("CDU/CSU als Union") },
                        leadingIcon = if (unionMode) {
                            { Icon(Icons.Filled.Check, null, Modifier.size(18.dp)) }
                        } else {
                            null
                        },
                    )
                }
            }
            item {
                StateContent(state, viewModel::refresh) { raw ->
                    val stats = if (unionMode) mergeUnion(raw) else raw.sortedByDescending { it.count }
                    val total = stats.sumOf { it.count }
                    if (stats.isEmpty()) {
                        EmptyView("Keine Daten für die ausgewählte Sendung und das Jahr.")
                        return@StateContent
                    }
                    val chartData = stats.map {
                        ChartDatum(partyShortName(it.partyName), it.count.toFloat(), partyColor(it.partyName, dark))
                    }
                    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        SectionCard(title = "Auftritte nach Partei", subtitle = "${total.formatInt()} Auftritte insgesamt") {
                            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                                listOf("Balken", "Kreis").forEachIndexed { index, label ->
                                    SegmentedButton(
                                        selected = chartType == index,
                                        onClick = { chartType = index },
                                        shape = SegmentedButtonDefaults.itemShape(index, 2),
                                        colors = SegmentedButtonDefaults.colors(inactiveContainerColor = Color.Transparent),
                                    ) { Text(label) }
                                }
                            }
                            Spacer(Modifier.padding(top = 16.dp))
                            if (chartType == 0) {
                                HorizontalBarChart(chartData)
                            } else {
                                DonutChart(chartData, centerLabel = "Auftritte", centerValue = total.formatInt())
                            }
                        }
                        SectionCard(title = "Detaillierte Aufschlüsselung", contentPadding = PaddingValues(vertical = 8.dp)) {
                            stats.forEachIndexed { index, party ->
                                if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                Row(
                                    Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    LegendItem(party.partyName, partyColor(party.partyName, dark), Modifier.weight(1f))
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(party.count.formatInt(), fontWeight = FontWeight.SemiBold)
                                        Text(
                                            "Anteil: ${percent(party.count, total)}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** CDU und CSU zu "Union" zusammenfassen – wie der Union-Schalter im Web. */
private fun mergeUnion(stats: List<PartyStat>): List<PartyStat> {
    val union = stats.filter { it.partyName == "CDU" || it.partyName == "CSU" }.sumOf { it.count }
    val rest = stats.filterNot { it.partyName == "CDU" || it.partyName == "CSU" }
    return (if (union > 0) rest + PartyStat("Union", union) else rest).sortedByDescending { it.count }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun PartyTimelineTab() {
    val viewModel = appViewModel { PartyTimelineViewModel(it) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val dark = LocalDarkTheme.current

    Refreshable(refreshing, viewModel::refresh) {
        LazyColumn(
            contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                PageIntro(
                    "Monatliche Entwicklung der Partei-Auftritte – Trends und Veränderungen in der Talkshow-Präsenz",
                    Modifier.padding(horizontal = 16.dp),
                )
            }
            item { FilterBar(show, year, viewModel::setShow, viewModel::setYear) }
            item {
                StateContent(state, viewModel::refresh) { timeline ->
                    if (timeline.series.isEmpty() || timeline.series.all { it.total == 0 }) {
                        EmptyView("Keine Daten für den gewählten Zeitraum.")
                        return@StateContent
                    }
                    // Standardmäßig die 6 präsentesten Parteien zeigen, damit das Diagramm lesbar bleibt.
                    var visible by remember(timeline) {
                        mutableStateOf(timeline.series.filter { it.total > 0 }.take(6).map { it.party }.toSet())
                    }
                    val labels = timeline.months.map { if (year == ALL_YEARS) formatMonth(it) else formatMonth(it.takeLast(2)) }
                    val series = timeline.series
                        .filter { it.party in visible }
                        .map { LineSeries(partyShortName(it.party), partyColor(it.party, dark), it.values) }

                    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                        SectionCard(title = "Auftritte pro Monat") {
                            LineChart(labels, series)
                            Spacer(Modifier.padding(top = 12.dp))
                            Text(
                                "Parteien ein-/ausblenden",
                                style = MaterialTheme.typography.labelLarge,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.padding(top = 4.dp))
                            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                timeline.series.filter { it.total > 0 }.forEach { s ->
                                    val on = s.party in visible
                                    FilterChip(
                                        selected = on,
                                        onClick = { visible = if (on) visible - s.party else visible + s.party },
                                        label = { LegendItem(partyShortName(s.party), partyColor(s.party, dark), dimmed = !on) },
                                    )
                                }
                            }
                        }
                        SectionCard(title = "Summe im Zeitraum") {
                            HorizontalBarChart(
                                timeline.series.filter { it.total > 0 }.map {
                                    ChartDatum(partyShortName(it.party), it.total.toFloat(), partyColor(it.party, dark))
                                },
                            )
                        }
                        Spacer(Modifier.width(1.dp))
                    }
                }
            }
        }
    }
}
