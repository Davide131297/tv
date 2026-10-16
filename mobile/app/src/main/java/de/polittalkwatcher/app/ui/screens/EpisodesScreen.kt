package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayCircleOutline
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import de.polittalkwatcher.app.data.Episode
import de.polittalkwatcher.app.data.EpisodeStatistics
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.ui.FilteredViewModel
import de.polittalkwatcher.app.ui.UiState
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.EmptyView
import de.polittalkwatcher.app.ui.components.ErrorView
import de.polittalkwatcher.app.ui.components.FilterBar
import de.polittalkwatcher.app.ui.components.LoadingView
import de.polittalkwatcher.app.ui.components.PageIntro
import de.polittalkwatcher.app.ui.components.PartyBadge
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionTitle
import de.polittalkwatcher.app.ui.components.StatTile
import de.polittalkwatcher.app.ui.components.TwoColumnGrid
import de.polittalkwatcher.app.ui.format2
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.formatLongDate
import de.polittalkwatcher.app.ui.theme.Accent
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

data class EpisodesData(val episodes: List<Episode>, val statistics: EpisodeStatistics)

class EpisodesViewModel(private val repository: PolittalkRepository) :
    FilteredViewModel<EpisodesData>(initialShow = "Markus Lanz") {
    init {
        load()
    }

    override suspend fun fetch(show: String, year: String) = coroutineScope {
        val episodes = async { repository.episodes(show, year) }
        val stats = async { repository.episodeStatistics(show, year) }
        EpisodesData(episodes.await(), stats.await())
    }
}

/** Sendungsübersicht – Web: `/sendungen` (Statistik-Kacheln + "Letzte Sendungen"). */
@Composable
fun EpisodesScreen(onOpenPolitician: (String, String?) -> Unit) {
    val viewModel = appViewModel { EpisodesViewModel(it) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()

    ScreenScaffold(title = "Sendungen") { padding ->
        Refreshable(refreshing, viewModel::refresh, Modifier.padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    PageIntro(
                        "Chronologische Übersicht aller Sendungen mit Politik-Gästen",
                        Modifier.padding(horizontal = 16.dp),
                    )
                }
                item { FilterBar(show, year, viewModel::setShow, viewModel::setYear, withAll = false) }

                when (val s = state) {
                    UiState.Loading -> item { LoadingView() }
                    is UiState.Error -> item { ErrorView(s.message, viewModel::refresh) }
                    is UiState.Success -> {
                        val stats = s.data.statistics
                        item {
                            TwoColumnGrid(
                                listOf(
                                    { m -> StatTile(stats.totalEpisodes.formatInt(), "Gesamt-Sendungen", Accent.Blue, m) },
                                    { m -> StatTile(stats.totalAppearances.formatInt(), "Politiker-Auftritte", Accent.Rose, m) },
                                    { m -> StatTile(stats.averagePoliticiansPerEpisode.format2(), "Ø Politiker pro Sendung", Accent.Purple, m) },
                                    { m -> StatTile(stats.maxPoliticiansInEpisode.formatInt(), "Max. Politiker/Sendung", Accent.Orange, m) },
                                ),
                                modifier = Modifier.padding(horizontal = 16.dp),
                            )
                        }
                        item { SectionTitle("Letzte Sendungen", Modifier.padding(horizontal = 16.dp, vertical = 4.dp)) }
                        if (s.data.episodes.isEmpty()) {
                            item { EmptyView("Keine Sendungen mit Politik-Gästen im gewählten Zeitraum.") }
                        }
                        items(s.data.episodes, key = { it.episodeDate }) { episode ->
                            EpisodeCard(episode, onOpenPolitician)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EpisodeCard(episode: Episode, onOpenPolitician: (String, String?) -> Unit) {
    val uriHandler = LocalUriHandler.current
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.padding(top = 14.dp, start = 14.dp, end = 14.dp, bottom = 6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    formatLongDate(episode.episodeDate),
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    "${episode.politicianCount} Politiker",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "Anwesende Politiker",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            episode.politicians.forEach { politician ->
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clickable { onOpenPolitician(politician.name, politician.partyName) }
                        .padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        politician.name,
                        style = MaterialTheme.typography.bodyMedium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Spacer(Modifier.width(8.dp))
                    PartyBadge(politician.partyName)
                }
            }
            val url = episode.episodeUrl
            if (url != null) {
                TextButton(onClick = { uriHandler.openUri(url) }, contentPadding = PaddingValues(horizontal = 0.dp)) {
                    Icon(Icons.Filled.PlayCircleOutline, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Episode ansehen")
                }
            } else {
                Text(
                    "Link nicht verfügbar",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(vertical = 10.dp),
                )
            }
        }
    }
}
