package de.polittalkwatcher.app.ui.screens

import androidx.compose.animation.core.animateIntAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import de.polittalkwatcher.app.R
import de.polittalkwatcher.app.data.Appearance
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.data.SummaryStats
import de.polittalkwatcher.app.ui.ALL_YEARS
import de.polittalkwatcher.app.ui.UiState
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.ErrorView
import de.polittalkwatcher.app.ui.components.LoadingView
import de.polittalkwatcher.app.ui.components.PartyBadge
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.SectionTitle
import de.polittalkwatcher.app.ui.components.StatTile
import de.polittalkwatcher.app.ui.components.TwoColumnGrid
import de.polittalkwatcher.app.ui.formatDate
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.loadState
import de.polittalkwatcher.app.ui.showLabel
import de.polittalkwatcher.app.ui.theme.Accent
import de.polittalkwatcher.app.ui.theme.LocalDarkTheme
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class HomeData(val summary: SummaryStats, val recent: List<Appearance>)

class HomeViewModel(private val repository: PolittalkRepository) : ViewModel() {
    private val _state = MutableStateFlow<UiState<HomeData>>(UiState.Loading)
    val state = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing = _refreshing.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            if (_state.value is UiState.Success) _refreshing.value = true else _state.value = UiState.Loading
            _state.value = loadState {
                val summary = async { repository.summary("all", ALL_YEARS) }
                val recent = async { repository.recentAppearances(8) }
                HomeData(summary.await(), recent.await())
            }
            _refreshing.value = false
        }
    }
}

private data class NavCard(
    val emoji: String,
    val title: String,
    val description: String,
    val accent: Accent,
    val onClick: () -> Unit,
)

/** Startseite – Aufbau wie `frontend/app/page.tsx`: Hero, Kennzahlen, Navigationskarten, letzte Auftritte. */
@Composable
fun HomeScreen(
    onOpenOverview: () -> Unit,
    onOpenParties: (tab: Int) -> Unit,
    onOpenPoliticians: (tab: Int) -> Unit,
    onOpenEpisodes: () -> Unit,
    onOpenTopics: () -> Unit,
    onOpenTvRatings: () -> Unit,
    onOpenPolitician: (String, String?) -> Unit,
) {
    val viewModel = appViewModel { HomeViewModel(it) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()

    val navCards = listOf(
        NavCard("📈", "Übersicht", "Gesamtstatistiken und Durchschnittswerte", Accent.Blue, onOpenOverview),
        NavCard("📊", "Parteien", "Verteilung der Politiker nach Parteien", Accent.Green) { onOpenParties(0) },
        NavCard("📋", "Politiker", "Alle Politiker mit ihren Auftritten", Accent.Purple) { onOpenPoliticians(0) },
        NavCard("📺", "Sendungen", "Chronologische Übersicht aller Sendungen", Accent.Orange, onOpenEpisodes),
        NavCard("🏆", "Rankings", "Die meistgeladenen Talkshow-Gäste", Accent.Yellow) { onOpenPoliticians(1) },
        NavCard("📅", "Zeitverlauf", "Monatliche Entwicklung der Partei-Auftritte", Accent.Teal) { onOpenParties(1) },
        NavCard("🏛️", "Themen", "Welche politischen Themen dominieren", Accent.Rose, onOpenTopics),
        NavCard("📡", "Einschaltquoten", "TV-Quoten zu Episoden und Gästen", Accent.Emerald, onOpenTvRatings),
    )

    ScreenScaffold(
        title = "Polittalk-Watcher",
        titleContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.logo), contentDescription = null, modifier = Modifier.size(32.dp))
                Spacer(Modifier.width(10.dp))
                Column {
                    Text("Polittalk", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        "Watcher",
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.primary,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        },
    ) { padding ->
        Refreshable(refreshing = refreshing, onRefresh = viewModel::load, modifier = Modifier.padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                item { Hero() }

                item {
                    when (val s = state) {
                        UiState.Loading -> LoadingView()
                        is UiState.Error -> ErrorView(s.message, viewModel::load)
                        is UiState.Success -> SummaryTiles(s.data.summary)
                    }
                }

                item {
                    SectionTitle("Entdecken", Modifier.padding(bottom = 12.dp))
                    TwoColumnGrid(navCards.map { card -> @Composable { mod: Modifier -> NavCardItem(card, mod) } })
                }

                val recent = (state as? UiState.Success)?.data?.recent.orEmpty()
                if (recent.isNotEmpty()) {
                    item {
                        SectionCard(title = "Letzte Auftritte", contentPadding = PaddingValues(vertical = 8.dp)) {
                            recent.forEachIndexed { index, appearance ->
                                if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                RecentRow(appearance) { onOpenPolitician(appearance.politicianName, appearance.partyName) }
                            }
                        }
                    }
                }

                item { About() }
            }
        }
    }
}

@Composable
private fun Hero() {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        Image(painterResource(R.drawable.logo), contentDescription = "Polittalk-Watcher Logo", modifier = Modifier.size(112.dp))
        Spacer(Modifier.height(8.dp))
        Text(
            "TV Politik Dashboard",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            "Entdecken Sie die Politik-Landschaft deutscher Talkshows mit interaktiven Statistiken " +
                "und detaillierten Analysen zu Politiker-Auftritten.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun SummaryTiles(summary: SummaryStats) {
    TwoColumnGrid(
        listOf(
            { m -> AnimatedStatTile(summary.totalAppearances, "Auftritte gesamt", Accent.Blue, m) },
            { m -> AnimatedStatTile(summary.totalEpisodes, "Sendungen erfasst", Accent.Green, m) },
            { m -> AnimatedStatTile(summary.uniquePoliticians, "Politiker erfasst", Accent.Purple, m) },
            { m -> AnimatedStatTile(summary.partiesRepresented, "Parteien vertreten", Accent.Orange, m) },
        ),
    )
}

/** Hochzählende Kennzahl (Web: `AnimatedCounter`). */
@Composable
fun AnimatedStatTile(value: Int, label: String, accent: Accent, modifier: Modifier = Modifier) {
    var target by remember { mutableIntStateOf(0) }
    LaunchedEffect(value) { target = value }
    val animated by animateIntAsState(target, tween(1200), label = "counter")
    StatTile(animated.formatInt(), label, accent, modifier)
}

@Composable
private fun NavCardItem(card: NavCard, modifier: Modifier) {
    val colors = card.accent.colors(LocalDarkTheme.current)
    Card(
        onClick = card.onClick,
        modifier = modifier.height(150.dp),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Column(Modifier.padding(14.dp)) {
            Box(
                Modifier
                    .size(40.dp)
                    .padding(0.dp),
                contentAlignment = Alignment.Center,
            ) {
                androidx.compose.material3.Surface(
                    shape = RoundedCornerShape(10.dp),
                    color = colors.container,
                    modifier = Modifier.size(40.dp),
                ) {
                    Box(contentAlignment = Alignment.Center) { Text(card.emoji, style = MaterialTheme.typography.titleLarge) }
                }
            }
            Spacer(Modifier.height(10.dp))
            Text(card.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
            Spacer(Modifier.height(4.dp))
            Text(
                card.description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 3,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun RecentRow(appearance: Appearance, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    appearance.politicianName,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                Spacer(Modifier.width(8.dp))
                PartyBadge(appearance.partyName)
            }
            Text(
                showLabel(appearance.showName),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Text(
            formatDate(appearance.episodeDate),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun About() {
    Column(Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        SectionTitle("Über dieses Dashboard")
        Spacer(Modifier.height(8.dp))
        Text(
            "Dieses Dashboard analysiert die Auftritte von Politikern in deutschen Talkshows " +
                "(Markus Lanz, Maybrit Illner, Caren Miosga, Maischberger & Hart aber fair) und stellt die Daten " +
                "in verschiedenen interaktiven Formaten dar. Die Informationen werden regelmäßig aktualisiert " +
                "und basieren auf öffentlich verfügbaren Quellen.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
        )
    }
}
