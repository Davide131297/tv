package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import de.polittalkwatcher.app.data.PartyTvStat
import de.polittalkwatcher.app.data.PoliticianTvStat
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.data.TvRating
import de.polittalkwatcher.app.data.TvRatingsDashboard
import de.polittalkwatcher.app.ui.UiState
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.ChartDatum
import de.polittalkwatcher.app.ui.components.ErrorView
import de.polittalkwatcher.app.ui.components.HorizontalBarChart
import de.polittalkwatcher.app.ui.components.LoadingView
import de.polittalkwatcher.app.ui.components.PageIntro
import de.polittalkwatcher.app.ui.components.PartyBadge
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.ShowBadge
import de.polittalkwatcher.app.ui.components.StatTile
import de.polittalkwatcher.app.ui.components.TwoColumnGrid
import de.polittalkwatcher.app.ui.format1
import de.polittalkwatcher.app.ui.format2
import de.polittalkwatcher.app.ui.formatDate
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.loadState
import de.polittalkwatcher.app.ui.partyColor
import de.polittalkwatcher.app.ui.partyShortName
import de.polittalkwatcher.app.ui.theme.Accent
import de.polittalkwatcher.app.ui.theme.LocalDarkTheme
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class TvRatingsViewModel(private val repository: PolittalkRepository) : ViewModel() {
    private val _state = MutableStateFlow<UiState<TvRatingsDashboard>>(UiState.Loading)
    val state = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing = _refreshing.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            if (_state.value is UiState.Success) _refreshing.value = true else _state.value = UiState.Loading
            _state.value = loadState { repository.tvRatings() }
            _refreshing.value = false
        }
    }
}

private fun mio(value: Double) = "${value.format2()} Mio."
private fun share(value: Double) = "${value.format1()} %"

/** Einschaltquoten – Web: `/einschaltquoten`. */
@Composable
fun TvRatingsScreen(onBack: () -> Unit, onOpenPolitician: (String, String?) -> Unit) {
    val viewModel = appViewModel { TvRatingsViewModel(it) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    var section by rememberSaveable { mutableIntStateOf(0) }

    ScreenScaffold(title = "Einschaltquoten", onBack = onBack) { padding ->
        Refreshable(refreshing, viewModel::load, Modifier.padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    PageIntro(
                        "Gespeicherte TV-Quoten mit Zuordnung zu Episoden, Politikern und Parteien. Die Analysen " +
                            "basieren auf kumulierten Zuschauerzahlen der erfassten Auftritte.",
                    )
                }
                when (val s = state) {
                    UiState.Loading -> item { LoadingView() }
                    is UiState.Error -> item { ErrorView(s.message, viewModel::load) }
                    is UiState.Success -> {
                        val data = s.data
                        item {
                            TwoColumnGrid(
                                listOf(
                                    { m -> StatTile(data.summary.totalRatings.formatInt(), "Gespeicherte Quoten", Accent.Blue, m) },
                                    { m -> StatTile(mio(data.summary.totalViewersMillions), "Zuschauer kumuliert", Accent.Green, m) },
                                    { m -> StatTile(share(data.summary.averageMarketShare), "Marktanteil im Schnitt", Accent.Purple, m) },
                                    { m -> StatTile(mio(data.summary.averageViewersMillions), "Zuschauer pro Sendung", Accent.Orange, m) },
                                ),
                            )
                        }
                        data.politicianStats.maxByOrNull { it.averageViewersMillions }?.let { top ->
                            item { TopPoliticianHighlight(top) { onOpenPolitician(top.politicianName, top.partyName) } }
                        }
                        item {
                            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                                listOf("Sendungen", "Politiker", "Parteien").forEachIndexed { index, label ->
                                    SegmentedButton(
                                        selected = section == index,
                                        onClick = { section = index },
                                        shape = SegmentedButtonDefaults.itemShape(index, 3),
                                        colors = SegmentedButtonDefaults.colors(inactiveContainerColor = Color.Transparent),
                                    ) { Text(label) }
                                }
                            }
                        }
                        when (section) {
                            0 -> items(data.ratings, key = { "${it.showName}-${it.episodeDate}" }) { RatingCard(it) }
                            1 -> {
                                item {
                                    Text(
                                        "Sortiert nach durchschnittlichen Zuschauerzahlen pro Politiker-Auftritt.",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    )
                                }
                                val sorted = data.politicianStats.sortedByDescending { it.averageViewersMillions }
                                items(sorted.size) { index ->
                                    val stat = sorted[index]
                                    PoliticianTvRow(index + 1, stat) { onOpenPolitician(stat.politicianName, stat.partyName) }
                                }
                            }
                            else -> item { PartySection(data.partyStats) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TopPoliticianHighlight(top: PoliticianTvStat, onClick: () -> Unit) {
    val colors = Accent.Emerald.colors(LocalDarkTheme.current)
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(16.dp),
        color = colors.container,
        border = BorderStroke(1.dp, colors.content.copy(alpha = 0.25f)),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(
                "Politiker mit den höchsten durchschnittlichen Einschaltquoten",
                style = MaterialTheme.typography.labelLarge,
                color = colors.content,
            )
            Spacer(Modifier.height(6.dp))
            Text(
                "${top.politicianName} · ${top.partyName.orEmpty()}",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                "${mio(top.averageViewersMillions)} Zuschauer im Schnitt bei ${top.appearances} bewerteten Auftritten",
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun RatingCard(rating: TvRating) {
    val uriHandler = LocalUriHandler.current
    val url = rating.episodeUrl
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = url != null) { url?.let(uriHandler::openUri) },
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.padding(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ShowBadge(rating.showName)
                Spacer(Modifier.width(8.dp))
                Text(
                    formatDate(rating.episodeDate),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.weight(1f),
                )
                if (url != null) {
                    Text("Episode ansehen", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                }
            }
            Spacer(Modifier.height(10.dp))
            Row {
                Metric(mio(rating.viewersMillions), "Zuschauer", Modifier.weight(1f))
                Metric(share(rating.marketShare), "Marktanteil", Modifier.weight(1f))
            }
            if (rating.politicians.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    rating.politicians.forEach { p ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(p.name, style = MaterialTheme.typography.bodySmall)
                            Spacer(Modifier.width(4.dp))
                            PartyBadge(p.partyName)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Metric(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(value, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
        Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun PoliticianTvRow(rank: Int, stat: PoliticianTvStat, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(
                "#$rank",
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.width(40.dp),
            )
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stat.politicianName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Spacer(Modifier.width(6.dp))
                    PartyBadge(stat.partyName)
                }
                Text(
                    "${stat.appearances} Auftritte · gesamt ${mio(stat.totalViewersMillions)} · Ø ${share(stat.averageMarketShare)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(stat.averageViewersMillions.format2(), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text("Mio. Ø", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun PartySection(stats: List<PartyTvStat>) {
    val dark = LocalDarkTheme.current
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard(title = "Partei-Ranking", subtitle = "Durchschnittliche Zuschauer pro bewerteter Episode") {
            HorizontalBarChart(
                stats.sortedByDescending { it.averageViewersMillions }.map {
                    ChartDatum(partyShortName(it.partyName), it.averageViewersMillions.toFloat(), partyColor(it.partyName, dark), it.averageViewersMillions.format2())
                },
            )
        }
        SectionCard(title = "Partei-Ranking nach absoluten Zuschauerzahlen", subtitle = "Kumulierte Zuschauer in Mio.") {
            HorizontalBarChart(
                stats.sortedByDescending { it.totalViewersMillions }.map {
                    ChartDatum(partyShortName(it.partyName), it.totalViewersMillions.toFloat(), partyColor(it.partyName, dark), it.totalViewersMillions.format1())
                },
            )
        }
        SectionCard(title = "Details") {
            stats.sortedByDescending { it.averageViewersMillions }.forEach { party ->
                Row(Modifier.fillMaxWidth().padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    PartyBadge(party.partyName)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        "${party.ratedEpisodes} Episoden · Ø ${share(party.averageMarketShare)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                    )
                    Text(mio(party.averageViewersMillions), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
