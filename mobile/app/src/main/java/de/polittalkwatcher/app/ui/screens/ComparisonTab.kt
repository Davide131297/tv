package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.SwapVert
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MenuAnchorType
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewModelScope
import de.polittalkwatcher.app.data.ComparisonRow
import de.polittalkwatcher.app.data.PolittalkRepository
import de.polittalkwatcher.app.data.PoliticianRanking
import de.polittalkwatcher.app.ui.ALL_YEARS
import de.polittalkwatcher.app.ui.UiState
import de.polittalkwatcher.app.ui.appViewModel
import de.polittalkwatcher.app.ui.components.EmptyView
import de.polittalkwatcher.app.ui.components.ErrorView
import de.polittalkwatcher.app.ui.components.LoadingView
import de.polittalkwatcher.app.ui.components.PageIntro
import de.polittalkwatcher.app.ui.components.PartyBadge
import de.polittalkwatcher.app.ui.components.SectionCard
import de.polittalkwatcher.app.ui.components.StateContent
import de.polittalkwatcher.app.ui.components.YearFilterChip
import de.polittalkwatcher.app.ui.loadState
import de.polittalkwatcher.app.ui.showLabel
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Vergleichsfarben wie im Web: Politiker A blau, Politiker B rot. */
private val ColorA = Color(0xFF2563EB)
private val ColorB = Color(0xFFDC2626)

class ComparisonViewModel(
    private val repository: PolittalkRepository,
    private val preselected: String,
) : ViewModel() {
    private val _options = MutableStateFlow<UiState<List<PoliticianRanking>>>(UiState.Loading)
    val options = _options.asStateFlow()

    val first = MutableStateFlow("")
    val second = MutableStateFlow("")
    val year = MutableStateFlow(ALL_YEARS)

    private val _result = MutableStateFlow<UiState<List<ComparisonRow>>?>(null)
    val result = _result.asStateFlow()
    private var compareJob: Job? = null

    init {
        loadOptions()
    }

    /** Auswahlliste wie im Web: alle Politiker aus den Rankings (über alle Jahre). */
    fun loadOptions() {
        viewModelScope.launch {
            _options.value = UiState.Loading
            val state = loadState { repository.rankings("all", ALL_YEARS, limit = 2000) }
            _options.value = state
            val list = (state as? UiState.Success)?.data.orEmpty()
            if (list.isNotEmpty() && first.value.isEmpty()) {
                first.value = list.firstOrNull { it.politicianName == preselected }?.politicianName ?: list[0].politicianName
                second.value = list.firstOrNull { it.politicianName != first.value }?.politicianName.orEmpty()
                compare()
            }
        }
    }

    fun select(isFirst: Boolean, name: String) {
        if (isFirst) first.value = name else second.value = name
        compare()
    }

    fun swap() {
        val a = first.value
        first.value = second.value
        second.value = a
        compare()
    }

    fun setYear(value: String) {
        year.value = value
        compare()
    }

    fun compare() {
        val a = first.value
        val b = second.value
        compareJob?.cancel()
        if (a.isBlank() || b.isBlank() || a == b) {
            _result.value = null
            return
        }
        compareJob = viewModelScope.launch {
            _result.value = UiState.Loading
            _result.value = loadState { repository.compare(a, b, year.value) }
        }
    }
}

/** Direkt-Vergleich zweier Politiker – Web: `/politiker/vergleich`. */
@Composable
fun ComparisonTab(preselected: String) {
    val viewModel = appViewModel(key = "comparison-$preselected") { ComparisonViewModel(it, preselected) }
    val options by viewModel.options.collectAsStateWithLifecycle()
    val first by viewModel.first.collectAsStateWithLifecycle()
    val second by viewModel.second.collectAsStateWithLifecycle()
    val year by viewModel.year.collectAsStateWithLifecycle()
    val result by viewModel.result.collectAsStateWithLifecycle()

    LazyColumn(
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            PageIntro("Zwei Politiker direkt gegenüberstellen und ihre Präsenz in den wichtigsten Talkshows vergleichen.")
        }
        item {
            StateContent(options, viewModel::loadOptions) { politicians ->
                val partyOf = remember(politicians) { politicians.associate { it.politicianName to it.partyName } }
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PoliticianPicker("Politiker A", first, ColorA, politicians) { viewModel.select(true, it) }
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                        YearFilterChip(year, viewModel::setYear)
                        Spacer(Modifier.weight(1f))
                        IconButton(onClick = viewModel::swap) {
                            Icon(Icons.Filled.SwapVert, contentDescription = "Politiker tauschen")
                        }
                    }
                    PoliticianPicker("Politiker B", second, ColorB, politicians) { viewModel.select(false, it) }

                    Spacer(Modifier.height(8.dp))
                    when (val r = result) {
                        null -> EmptyView("Wähle zwei unterschiedliche Politiker aus, um den Vergleich zu starten.")
                        UiState.Loading -> LoadingView()
                        is UiState.Error -> ErrorView(r.message, viewModel::compare)
                        is UiState.Success -> ComparisonResult(first, second, partyOf[first], partyOf[second], r.data)
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PoliticianPicker(
    label: String,
    selected: String,
    color: Color,
    politicians: List<PoliticianRanking>,
    onSelect: (String) -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    var query by remember(selected) { mutableStateOf(selected) }
    val suggestions = remember(query, politicians) {
        val q = query.trim()
        if (q.isEmpty() || q == selected) {
            politicians.take(8)
        } else {
            politicians.filter { it.politicianName.contains(q, ignoreCase = true) || it.partyName.orEmpty().contains(q, ignoreCase = true) }.take(8)
        }
    }

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                expanded = true
            },
            label = { Text(label, color = color) },
            singleLine = true,
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            modifier = Modifier
                .fillMaxWidth()
                .menuAnchor(MenuAnchorType.PrimaryEditable),
        )
        ExposedDropdownMenu(
            expanded = expanded && suggestions.isNotEmpty(),
            onDismissRequest = {
                expanded = false
                query = selected
            },
        ) {
            suggestions.forEach { politician ->
                DropdownMenuItem(
                    text = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(politician.politicianName, modifier = Modifier.weight(1f, fill = false))
                            Spacer(Modifier.width(8.dp))
                            PartyBadge(politician.partyName)
                        }
                    },
                    onClick = {
                        expanded = false
                        query = politician.politicianName
                        onSelect(politician.politicianName)
                    },
                )
            }
        }
    }
}

@Composable
private fun ComparisonResult(
    nameA: String,
    nameB: String,
    partyA: String?,
    partyB: String?,
    rows: List<ComparisonRow>,
) {
    val totalA = rows.sumOf { it.a }
    val totalB = rows.sumOf { it.b }
    if (totalA + totalB == 0) {
        EmptyView("Keine Auftritte im gewählten Zeitraum.")
        return
    }
    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        SectionCard {
            Row(verticalAlignment = Alignment.CenterVertically) {
                ScoreColumn(nameA, partyA, totalA, ColorA, Modifier.weight(1f))
                Text("vs.", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                ScoreColumn(nameB, partyB, totalB, ColorB, Modifier.weight(1f))
            }
        }
        SectionCard(title = "Show-Profil im direkten Vergleich", subtitle = "Auftritte je Leitformat") {
            val max = rows.maxOf { maxOf(it.a, it.b) }.coerceAtLeast(1)
            rows.forEachIndexed { index, row ->
                if (index > 0) HorizontalDivider(Modifier.padding(vertical = 10.dp), color = MaterialTheme.colorScheme.outlineVariant)
                Text(showLabel(row.show), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                Spacer(Modifier.height(6.dp))
                ComparisonBar(row.a, max, ColorA)
                Spacer(Modifier.height(4.dp))
                ComparisonBar(row.b, max, ColorB)
            }
        }
    }
}

@Composable
private fun ScoreColumn(name: String, party: String?, total: Int, color: Color, modifier: Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(total.toString(), style = MaterialTheme.typography.displaySmall, fontWeight = FontWeight.Black, color = color)
        Text(name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
        Spacer(Modifier.height(4.dp))
        PartyBadge(party)
    }
}

@Composable
private fun ComparisonBar(value: Int, max: Int, color: Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        androidx.compose.foundation.layout.Box(
            Modifier
                .weight(1f)
                .height(12.dp)
                .padding(end = 8.dp),
        ) {
            androidx.compose.material3.LinearProgressIndicator(
                progress = { value.toFloat() / max },
                modifier = Modifier.fillMaxWidth().height(12.dp),
                color = color,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
                drawStopIndicator = {},
                gapSize = 0.dp,
            )
        }
        Text(value.toString(), style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold, color = color)
    }
}
