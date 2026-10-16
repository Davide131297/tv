package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import de.polittalkwatcher.app.data.Appearance
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.data.PoliticianRanking
import de.polittalkwatcher.app.ui.FilteredViewModel
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.EmptyView
import de.polittalkwatcher.app.ui.components.ErrorView
import de.polittalkwatcher.app.ui.components.FilterBar
import de.polittalkwatcher.app.ui.components.LoadingView
import de.polittalkwatcher.app.ui.components.PartyBadge
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.ShowBadge
import de.polittalkwatcher.app.ui.components.StateContent
import de.polittalkwatcher.app.ui.currentYear
import de.polittalkwatcher.app.ui.formatDate
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.toUserMessage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.debounce
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Politiker – Web: `/politiker` (Datenbank), `/politiker-rankings`, `/politiker/vergleich` als Tabs. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PoliticiansScreen(
    initialTab: Int,
    initialSearch: String,
    onOpenPolitician: (String, String?) -> Unit,
) {
    var tab by rememberSaveable(initialTab) { mutableIntStateOf(initialTab) }
    ScreenScaffold(title = "Politiker") { padding ->
        Column(Modifier.padding(padding)) {
            PrimaryTabRow(selectedTabIndex = tab) {
                Tab(selected = tab == 0, onClick = { tab = 0 }, text = { Text("Datenbank") }, unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                Tab(selected = tab == 1, onClick = { tab = 1 }, text = { Text("Rankings") }, unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant)
                Tab(selected = tab == 2, onClick = { tab = 2 }, text = { Text("Vergleich") }, unselectedContentColor = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            when (tab) {
                0 -> PoliticianListTab(initialSearch.takeIf { initialTab == 0 }.orEmpty(), onOpenPolitician)
                1 -> RankingsTab(onOpenPolitician)
                else -> ComparisonTab(initialSearch.takeIf { initialTab == 2 }.orEmpty())
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Datenbank: paginierte, durchsuchbare Auftrittsliste
// ---------------------------------------------------------------------------

data class AppearanceListState(
    val items: List<Appearance> = emptyList(),
    val total: Int = 0,
    val initialLoading: Boolean = true,
    val loadingMore: Boolean = false,
    val refreshing: Boolean = false,
    val error: String? = null,
) {
    val endReached: Boolean get() = items.size >= total
}

@OptIn(FlowPreview::class)
class PoliticianListViewModel(
    private val repository: PolittalkRepository,
    initialSearch: String,
) : ViewModel() {
    val show = MutableStateFlow("all")
    val year = MutableStateFlow(currentYear)
    val search = MutableStateFlow(initialSearch)

    private val _state = MutableStateFlow(AppearanceListState())
    val state = _state.asStateFlow()
    private var pageJob: Job? = null

    init {
        viewModelScope.launch {
            combine(show, year, search.debounce { if (it.isBlank()) 0 else SEARCH_DEBOUNCE_MS }.distinctUntilChanged()) { s, y, q ->
                Triple(s, y, q)
            }.collectLatest { reload(isRefresh = false) }
        }
    }

    fun refresh() = viewModelScope.launch { reload(isRefresh = true) }

    private suspend fun reload(isRefresh: Boolean) {
        pageJob?.cancel()
        _state.update {
            if (isRefresh) it.copy(refreshing = true, error = null) else AppearanceListState(initialLoading = true)
        }
        try {
            val (items, total) = repository.appearances(show.value, year.value, search.value, PAGE_SIZE, 0)
            _state.value = AppearanceListState(items = items, total = total, initialLoading = false)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            _state.update { it.copy(initialLoading = false, refreshing = false, error = e.toUserMessage()) }
        }
    }

    fun loadMore() {
        val current = _state.value
        if (current.loadingMore || current.initialLoading || current.endReached || current.error != null) return
        pageJob = viewModelScope.launch {
            _state.update { it.copy(loadingMore = true) }
            try {
                val (items, total) = repository.appearances(show.value, year.value, search.value, PAGE_SIZE, current.items.size)
                _state.update { it.copy(items = it.items + items, total = if (items.isEmpty()) it.items.size else total, loadingMore = false) }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _state.update { it.copy(loadingMore = false, error = e.toUserMessage()) }
            }
        }
    }

    fun retry() = viewModelScope.launch { reload(isRefresh = false) }

    companion object {
        private const val PAGE_SIZE = 20
        private const val SEARCH_DEBOUNCE_MS = 400L
    }
}

@Composable
private fun PoliticianListTab(initialSearch: String, onOpenPolitician: (String, String?) -> Unit) {
    val viewModel = appViewModel(key = "politician-list-$initialSearch") { PoliticianListViewModel(it, initialSearch) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val search by viewModel.search.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    val focusManager = LocalFocusManager.current

    val shouldLoadMore by remember {
        derivedStateOf {
            val last = listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= listState.layoutInfo.totalItemsCount - 5
        }
    }
    LaunchedEffect(shouldLoadMore, state.items.size) {
        if (shouldLoadMore) viewModel.loadMore()
    }

    Refreshable(state.refreshing, { viewModel.refresh() }) {
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                OutlinedTextField(
                    value = search,
                    onValueChange = { viewModel.search.value = it },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    placeholder = { Text("Politiker oder Partei suchen") },
                    leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
                    trailingIcon = {
                        if (search.isNotEmpty()) {
                            IconButton(onClick = { viewModel.search.value = "" }) {
                                Icon(Icons.Filled.Clear, contentDescription = "Suche löschen")
                            }
                        }
                    },
                    singleLine = true,
                    shape = RoundedCornerShape(28.dp),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { focusManager.clearFocus() }),
                )
            }
            item {
                FilterBar(show, year, { viewModel.show.value = it }, { viewModel.year.value = it })
            }
            when {
                state.initialLoading -> item { LoadingView() }
                state.error != null && state.items.isEmpty() -> item { ErrorView(state.error!!, { viewModel.retry() }) }
                state.items.isEmpty() -> item { EmptyView("Keine Auftritte gefunden.") }
                else -> {
                    item {
                        Text(
                            "${state.total.formatInt()} Auftritte gefunden",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(horizontal = 16.dp),
                        )
                    }
                    itemsIndexed(state.items, key = { index, a -> "$index-${a.politicianName}-${a.episodeDate}" }) { _, appearance ->
                        AppearanceCard(appearance) { onOpenPolitician(appearance.politicianName, appearance.partyName) }
                    }
                    if (state.loadingMore) {
                        item {
                            Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator()
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun AppearanceCard(appearance: Appearance, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        appearance.politicianName,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                    Spacer(Modifier.width(8.dp))
                    PartyBadge(appearance.partyName)
                }
                Spacer(Modifier.height(6.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ShowBadge(appearance.showName)
                    Spacer(Modifier.width(8.dp))
                    Text(
                        formatDate(appearance.episodeDate),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

// ---------------------------------------------------------------------------
// Rankings
// ---------------------------------------------------------------------------

class RankingsViewModel(private val repository: PolittalkRepository) : FilteredViewModel<List<PoliticianRanking>>() {
    init {
        load()
    }

    override suspend fun fetch(show: String, year: String) = repository.rankings(show, year, limit = 50)
}

@Composable
private fun RankingsTab(onOpenPolitician: (String, String?) -> Unit) {
    val viewModel = appViewModel { RankingsViewModel(it) }
    val show by viewModel.show.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()

    Refreshable(refreshing, viewModel::refresh) {
        LazyColumn(
            contentPadding = PaddingValues(top = 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            item {
                Text(
                    "🏆 Die meistgeladenen Talkshow-Gäste",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(horizontal = 16.dp),
                )
            }
            item { FilterBar(show, year, viewModel::setShow, viewModel::setYear) }
            item {
                StateContent(state, viewModel::refresh) { rankings ->
                    if (rankings.isEmpty()) {
                        EmptyView("Keine Daten gefunden für die ausgewählte Show.")
                    } else {
                        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "${rankings.size} Top-Politiker gefunden",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(horizontal = 16.dp),
                            )
                            rankings.forEachIndexed { index, ranking ->
                                RankingCard(index + 1, ranking) { onOpenPolitician(ranking.politicianName, ranking.partyName) }
                            }
                        }
                    }
                }
            }
        }
    }
}

/** Platzierungsfarben wie `getRankBadgeColor` im Web (Gold, Silber, Bronze, Top 10). */
@Composable
private fun rankColors(rank: Int): Pair<Color, Color> = when {
    rank == 1 -> Color(0xFFEAB308) to Color.White
    rank == 2 -> Color(0xFF9CA3AF) to Color.White
    rank == 3 -> Color(0xFFC2410C) to Color.White
    rank <= 10 -> MaterialTheme.colorScheme.primaryContainer to MaterialTheme.colorScheme.onPrimaryContainer
    else -> MaterialTheme.colorScheme.surfaceVariant to MaterialTheme.colorScheme.onSurfaceVariant
}

@Composable
private fun RankingCard(rank: Int, ranking: PoliticianRanking, onClick: () -> Unit) {
    val (badgeBg, badgeFg) = rankColors(rank)
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = RoundedCornerShape(50), color = badgeBg, contentColor = badgeFg, modifier = Modifier.widthIn(min = 40.dp)) {
                Text(
                    "#$rank",
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    ranking.politicianName,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(Modifier.height(4.dp))
                PartyBadge(ranking.partyName)
                Spacer(Modifier.height(4.dp))
                Text(
                    buildString {
                        append("${ranking.showsAppearedOn} ")
                        append(if (ranking.showsAppearedOn == 1) "Show" else "Shows")
                        ranking.latestAppearance?.let { append(" · zuletzt ${formatDate(it)}") }
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    ranking.totalAppearances.toString(),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text("Auftritte", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}
