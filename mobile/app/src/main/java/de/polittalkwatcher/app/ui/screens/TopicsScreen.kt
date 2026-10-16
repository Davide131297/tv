package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.polittalkwatcher.app.data.PoliticalAreaStat
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.ui.FilteredViewModel
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.ChartDatum
import de.polittalkwatcher.app.ui.components.EmptyView
import de.polittalkwatcher.app.ui.components.FilterBar
import de.polittalkwatcher.app.ui.components.HorizontalBarChart
import de.polittalkwatcher.app.ui.components.LegendItem
import de.polittalkwatcher.app.ui.components.PageIntro
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.StateContent
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.percent
import de.polittalkwatcher.app.ui.theme.LocalDarkTheme

class TopicsViewModel(private val repository: PolittalkRepository) : FilteredViewModel<List<PoliticalAreaStat>>() {
    init {
        load()
    }

    override suspend fun fetch(show: String, year: String) = repository.politicalAreas(show, year)
}

/** Themenfarben wie `POLITICAL_AREA_COLORS` im Web. */
private fun areaColor(id: Int, dark: Boolean): Color = when (id) {
    1 -> Color(0xFF059669)
    2 -> Color(0xFF2563EB)
    3 -> if (dark) Color(0xFF94A3B8) else Color(0xFF1E293B)
    4 -> Color(0xFFEAB308)
    5 -> Color(0xFFB91C1C)
    6 -> Color(0xFF06B6D4)
    7 -> Color(0xFFEA580C)
    else -> Color(0xFF8B5CF6)
}

/** Politische Themen – Web: `/politische-themen` (Diagramm + Themen-Tabelle). */
@Composable
fun TopicsScreen(onBack: () -> Unit) {
    val viewModel = appViewModel { TopicsViewModel(it) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val dark = LocalDarkTheme.current

    ScreenScaffold(title = "Politische Themen", onBack = onBack) { padding ->
        Refreshable(refreshing, viewModel::refresh, Modifier.padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    PageIntro(
                        "Verteilung der politischen Themen in deutschen TV-Talkshows",
                        Modifier.padding(horizontal = 16.dp),
                    )
                }
                item { FilterBar(show, year, viewModel::setShow, viewModel::setYear) }
                item {
                    StateContent(state, viewModel::refresh) { areas ->
                        if (areas.isEmpty()) {
                            EmptyView("Keine Themen für die ausgewählte Sendung und das Jahr.")
                            return@StateContent
                        }
                        val total = areas.sumOf { it.count }
                        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            SectionCard(
                                title = "🏛️ Politische Themenbereiche",
                                subtitle = "${total.formatInt()} Themenzuordnungen",
                            ) {
                                HorizontalBarChart(
                                    areas.map { ChartDatum(it.areaLabel, it.count.toFloat(), areaColor(it.areaId, dark)) },
                                    labelAbove = true,
                                )
                            }
                            SectionCard(title = "Themen-Details", contentPadding = PaddingValues(vertical = 8.dp)) {
                                areas.forEachIndexed { index, area ->
                                    if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                    Row(
                                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Text(
                                            "${index + 1}.",
                                            style = MaterialTheme.typography.labelLarge,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                        Spacer(Modifier.width(8.dp))
                                        LegendItem(area.areaLabel, areaColor(area.areaId, dark), Modifier.weight(1f))
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(area.count.formatInt(), fontWeight = FontWeight.SemiBold)
                                            Text(
                                                percent(area.count, total),
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
}
