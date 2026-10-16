package de.polittalkwatcher.app.ui.screens

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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.automirrored.filled.CompareArrows
import androidx.compose.material.icons.filled.PlayCircleOutline
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import de.polittalkwatcher.app.data.PoliticianProfile
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.ui.UiState
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.ChartDatum
import de.polittalkwatcher.app.ui.components.EmptyView
import de.polittalkwatcher.app.ui.components.HorizontalBarChart
import de.polittalkwatcher.app.ui.components.PartyBadge
import de.polittalkwatcher.app.ui.components.Refreshable
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.ShowBadge
import de.polittalkwatcher.app.ui.components.StateContent
import de.polittalkwatcher.app.ui.formatLongDate
import de.polittalkwatcher.app.ui.formatInt
import de.polittalkwatcher.app.ui.loadState
import de.polittalkwatcher.app.ui.showLabel
import de.polittalkwatcher.app.ui.showOption
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class PoliticianDetailViewModel(
    private val repository: PolittalkRepository,
    private val name: String,
) : ViewModel() {
    private val _state = MutableStateFlow<UiState<PoliticianProfile>>(UiState.Loading)
    val state = _state.asStateFlow()
    private val _refreshing = MutableStateFlow(false)
    val refreshing = _refreshing.asStateFlow()

    init {
        load()
    }

    fun load() {
        viewModelScope.launch {
            if (_state.value is UiState.Success) _refreshing.value = true else _state.value = UiState.Loading
            _state.value = loadState { repository.politicianProfile(name) }
            _refreshing.value = false
        }
    }
}

/** Politiker-Detailseite – App-Pendant zum `PoliticianModal` im Web. */
@Composable
fun PoliticianDetailScreen(
    name: String,
    party: String?,
    onBack: () -> Unit,
    onCompare: (String) -> Unit,
) {
    val viewModel = appViewModel(key = "politician-$name") { PoliticianDetailViewModel(it, name) }
    val state by viewModel.state.collectAsStateWithLifecycle()
    val refreshing by viewModel.refreshing.collectAsStateWithLifecycle()
    val uriHandler = LocalUriHandler.current

    ScreenScaffold(title = name, onBack = onBack) { padding ->
        Refreshable(refreshing, viewModel::load, Modifier.padding(padding)) {
            LazyColumn(
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Column {
                        Text(name, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                        Spacer(Modifier.height(6.dp))
                        PartyBadge(party)
                    }
                }
                item {
                    StateContent(state, viewModel::load) { profile ->
                        Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                            Row(verticalAlignment = Alignment.Bottom) {
                                Text(
                                    profile.totalAppearances.formatInt(),
                                    style = MaterialTheme.typography.displaySmall,
                                    fontWeight = FontWeight.Black,
                                    color = MaterialTheme.colorScheme.primary,
                                )
                                Spacer(Modifier.width(8.dp))
                                Text(
                                    "Talkshow-Auftritte insgesamt",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(bottom = 8.dp),
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { onCompare(name) }) {
                                    Icon(Icons.AutoMirrored.Filled.CompareArrows, null, Modifier.size(18.dp))
                                    Spacer(Modifier.width(6.dp))
                                    Text("Vergleichen")
                                }
                                profile.abgeordnetenwatchUrl?.let { url ->
                                    OutlinedButton(onClick = { uriHandler.openUri(url) }) {
                                        Icon(Icons.AutoMirrored.Filled.OpenInNew, null, Modifier.size(18.dp))
                                        Spacer(Modifier.width(6.dp))
                                        Text("abgeordnetenwatch")
                                    }
                                }
                            }

                            val perShow = profile.perShow.filter { it.a > 0 }
                            if (perShow.isNotEmpty()) {
                                SectionCard(title = "Auftritte je Sendung") {
                                    HorizontalBarChart(
                                        perShow.sortedByDescending { it.a }.map { row ->
                                            ChartDatum(
                                                showLabel(row.show),
                                                row.a.toFloat(),
                                                showOption(row.show)?.content ?: MaterialTheme.colorScheme.primary,
                                            )
                                        },
                                    )
                                }
                            }

                            SectionCard(
                                title = "Auftritte",
                                subtitle = if (profile.recentAppearances.size >= 20) "Die letzten 20 Auftritte" else null,
                                contentPadding = PaddingValues(vertical = 8.dp),
                            ) {
                                if (profile.recentAppearances.isEmpty()) {
                                    EmptyView("Keine Auftritte gefunden.")
                                }
                                profile.recentAppearances.forEachIndexed { index, appearance ->
                                    if (index > 0) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
                                    val url = appearance.episodeUrl
                                    Row(
                                        Modifier
                                            .fillMaxWidth()
                                            .clickable(enabled = url != null) { url?.let(uriHandler::openUri) }
                                            .padding(horizontal = 16.dp, vertical = 12.dp),
                                        verticalAlignment = Alignment.CenterVertically,
                                    ) {
                                        Column(Modifier.weight(1f)) {
                                            ShowBadge(appearance.showName)
                                            Spacer(Modifier.height(4.dp))
                                            Text(formatLongDate(appearance.episodeDate), style = MaterialTheme.typography.bodyMedium)
                                        }
                                        if (url != null) {
                                            Icon(
                                                Icons.Filled.PlayCircleOutline,
                                                contentDescription = "Episode ansehen",
                                                tint = MaterialTheme.colorScheme.primary,
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
