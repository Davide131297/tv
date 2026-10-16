package de.polittalkwatcher.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import de.polittalkwatcher.app.ui.theme.LocalDarkTheme
import de.polittalkwatcher.app.ui.SHOW_OPTIONS
import de.polittalkwatcher.app.ui.SHOW_OPTIONS_WITHOUT_ALL
import de.polittalkwatcher.app.ui.yearLabel
import de.polittalkwatcher.app.ui.yearOptions

/**
 * Horizontal scrollbare Sendungs-Auswahl – App-Pendant zu `ShowOptionsButtons` im Web.
 * Die ausgewählte Sendung wird in ihrer Show-Farbe hervorgehoben.
 */
@Composable
fun ShowFilterRow(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    withAll: Boolean = true,
) {
    val options = if (withAll) SHOW_OPTIONS else SHOW_OPTIONS_WITHOUT_ALL
    val dark = LocalDarkTheme.current
    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(options, key = { it.value }) { option ->
            val isSelected = option.value == selected
            val allInDark = dark && option.value == "all"
            FilterChip(
                selected = isSelected,
                onClick = { onSelect(option.value) },
                label = { Text(option.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = if (allInDark) MaterialTheme.colorScheme.onSurface else option.container,
                    selectedLabelColor = if (allInDark) MaterialTheme.colorScheme.surface else option.content,
                    selectedLeadingIconColor = if (allInDark) MaterialTheme.colorScheme.surface else option.content,
                ),
                leadingIcon = if (isSelected) {
                    { Icon(Icons.Filled.Check, contentDescription = null, modifier = Modifier.size(18.dp)) }
                } else {
                    null
                },
            )
        }
    }
}

/** Jahres-Auswahl als Chip mit Dropdown (Web: `NativeSelect` mit "Insgesamt" + Jahren). */
@Composable
fun YearFilterChip(
    selected: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    Box(modifier) {
        FilterChip(
            selected = false,
            onClick = { expanded = true },
            label = { Text("Jahr: ${yearLabel(selected)}") },
            leadingIcon = { Icon(Icons.Outlined.CalendarMonth, contentDescription = null, modifier = Modifier.size(18.dp)) },
            trailingIcon = { Icon(Icons.Filled.ArrowDropDown, contentDescription = null) },
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            yearOptions().forEach { year ->
                DropdownMenuItem(
                    text = { Text(yearLabel(year)) },
                    onClick = {
                        expanded = false
                        onSelect(year)
                    },
                    trailingIcon = if (year == selected) {
                        { Icon(Icons.Filled.Check, contentDescription = null) }
                    } else {
                        null
                    },
                )
            }
        }
    }
}

/** Kombinierte Filterleiste: Sendungen + Jahr (+ optionale weitere Steuerelemente rechts). */
@Composable
fun FilterBar(
    show: String,
    year: String,
    onShowChange: (String) -> Unit,
    onYearChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    withAll: Boolean = true,
    trailing: @Composable RowScope.() -> Unit = {},
) {
    Column(modifier.fillMaxWidth()) {
        ShowFilterRow(selected = show, onSelect = onShowChange, withAll = withAll)
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            YearFilterChip(selected = year, onSelect = onYearChange)
            trailing()
        }
    }
}
