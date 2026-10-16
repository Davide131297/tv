package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.data.SummaryStats
import de.polittalkwatcher.app.ui.FilteredViewModel
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.FilterBar
import de.polittalkwatcher.app.ui.components.PageIntro
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.StateContent
import de.polittalkwatcher.app.ui.components.TwoColumnGrid
import de.polittalkwatcher.app.ui.format1
import de.polittalkwatcher.app.ui.showLabel
import de.polittalkwatcher.app.ui.theme.Accent

class OverviewViewModel(private val repository: PolittalkRepository) : FilteredViewModel<SummaryStats>() {
    init {
        load()
    }

    override suspend fun fetch(show: String, year: String) = repository.summary(show, year)
}

/** Gesamtübersicht – Web: `/uebersicht` (Kennzahlen + Durchschnittswerte). */
@Composable
fun OverviewScreen(onBack: () -> Unit) {
    val viewModel = appViewModel { OverviewViewModel(it) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()

    ScreenScaffold(title = "Gesamtübersicht", onBack = onBack) { padding ->
        Refreshable(refreshing, viewModel::refresh, Modifier.padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    PageIntro(
                        "Übersicht über alle Politiker-Auftritte in deutschen TV-Talkshows",
                        Modifier.padding(horizontal = 16.dp),
                    )
                }
                item { FilterBar(show, year, viewModel::setShow, viewModel::setYear) }
                item {
                    StateContent(state, viewModel::refresh) { summary ->
                        Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            Text(
                                "📊 Statistiken für: ${summary.showName ?: showLabel(show)}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                            TwoColumnGrid(
                                listOf(
                                    { m -> AnimatedStatTile(summary.totalAppearances, "Gesamt-Auftritte", Accent.Blue, m) },
                                    { m -> AnimatedStatTile(summary.totalEpisodes, "Sendungen", Accent.Green, m) },
                                    { m -> AnimatedStatTile(summary.uniquePoliticians, "Verschiedene Politiker", Accent.Purple, m) },
                                    { m -> AnimatedStatTile(summary.partiesRepresented, "Vertretene Parteien", Accent.Orange, m) },
                                ),
                            )
                            Averages(summary)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Averages(summary: SummaryStats) {
    fun ratio(a: Int, b: Int) = if (b == 0) 0.0 else a.toDouble() / b
    SectionCard(title = "📊 Durchschnittswerte") {
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AverageRow(ratio(summary.totalAppearances, summary.totalEpisodes), "Politiker pro Sendung")
            AverageRow(ratio(summary.totalAppearances, summary.uniquePoliticians), "Auftritte pro Politiker")
            AverageRow(ratio(summary.uniquePoliticians, summary.partiesRepresented), "Politiker pro Partei")
        }
    }
}

@Composable
private fun AverageRow(value: Double, label: String) {
    androidx.compose.material3.Surface(
        color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
        shape = MaterialTheme.shapes.medium,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp), horizontalAlignment = androidx.compose.ui.Alignment.CenterHorizontally) {
            Text(value.format1(), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            Text(
                label,
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}
