package de.polittalkwatcher.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Inbox
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import de.polittalkwatcher.app.ui.UiState
import de.polittalkwatcher.app.ui.onPartyColor
import de.polittalkwatcher.app.ui.partyColor
import de.polittalkwatcher.app.ui.partyShortName
import de.polittalkwatcher.app.ui.showOption
import de.polittalkwatcher.app.ui.theme.Accent
import de.polittalkwatcher.app.ui.theme.LocalDarkTheme

/** Standard-Innenabstand der Bildschirme (entspricht `px-4` im Web). */
val ScreenPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp)

/** Einleitungstext unter der App-Bar – entspricht der Unterzeile der Web-Überschriften. */
@Composable
fun PageIntro(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier,
    )
}

@Composable
fun SectionTitle(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = modifier,
    )
}

/** Karte mit Überschrift – entspricht den weißen `rounded-lg shadow-md` Sektionen im Web. */
@Composable
fun SectionCard(
    modifier: Modifier = Modifier,
    title: String? = null,
    subtitle: String? = null,
    contentPadding: PaddingValues = PaddingValues(16.dp),
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
    ) {
        if (title != null) {
            Column(Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp)) {
                SectionTitle(title)
                if (subtitle != null) {
                    Spacer(Modifier.height(2.dp))
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        Column(Modifier.padding(contentPadding), content = content)
    }
}

/** Farbige Kennzahl-Kachel (Web: `ColorBox`). */
@Composable
fun StatTile(
    value: String,
    label: String,
    accent: Accent,
    modifier: Modifier = Modifier,
) {
    val colors = accent.colors(LocalDarkTheme.current)
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = colors.container,
        border = BorderStroke(1.dp, colors.content.copy(alpha = 0.18f)),
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = colors.content,
                maxLines = 1,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.labelMedium,
                color = colors.content.copy(alpha = 0.85f),
                textAlign = TextAlign.Center,
                maxLines = 2,
            )
        }
    }
}

/** Ordnet Kacheln in einem zweispaltigen Raster an (Web: `grid-cols-2`). */
@Composable
fun TwoColumnGrid(
    items: List<@Composable (Modifier) -> Unit>,
    modifier: Modifier = Modifier,
    spacing: androidx.compose.ui.unit.Dp = 12.dp,
) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(spacing)) {
        items.chunked(2).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(spacing)) {
                row.forEach { item -> item(Modifier.weight(1f)) }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

/** Partei-Badge in Parteifarbe. */
@Composable
fun PartyBadge(party: String?, modifier: Modifier = Modifier) {
    val name = party?.takeIf { it.isNotBlank() } ?: "Unbekannt"
    val dark = LocalDarkTheme.current
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = partyColor(name, dark),
        contentColor = if (dark && (name == "CDU" || name == "Union")) Color.Black else onPartyColor(name),
    ) {
        Text(
            text = partyShortName(name),
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}

/** Sendungs-Badge in der Farbe der Show (Web: `getShowBadgeClasses`). */
@Composable
fun ShowBadge(show: String, modifier: Modifier = Modifier) {
    val option = showOption(show)
    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = option?.takeIf { it.value != "all" }?.container ?: MaterialTheme.colorScheme.surfaceVariant,
        contentColor = option?.takeIf { it.value != "all" }?.content ?: MaterialTheme.colorScheme.onSurfaceVariant,
    ) {
        Text(
            text = option?.label ?: show,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
        )
    }
}

@Composable
fun LoadingView(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator()
    }
}

@Composable
fun ErrorView(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxWidth().padding(vertical = 40.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Outlined.CloudOff,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(48.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(message, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(16.dp))
        Button(onClick = onRetry) { Text("Erneut versuchen") }
    }
}

@Composable
fun EmptyView(text: String, modifier: Modifier = Modifier) {
    Column(
        modifier.fillMaxWidth().padding(vertical = 40.dp, horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            Icons.Outlined.Inbox,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.size(40.dp),
        )
        Spacer(Modifier.height(8.dp))
        Text(text, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

/** Zeigt je nach [state] Ladeanzeige, Fehler oder Inhalt. */
@Composable
fun <T> StateContent(
    state: UiState<T>,
    onRetry: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable (T) -> Unit,
) {
    when (state) {
        UiState.Loading -> LoadingView(modifier)
        is UiState.Error -> ErrorView(state.message, onRetry, modifier)
        is UiState.Success -> content(state.data)
    }
}

/** Pull-to-Refresh-Container für alle Datenbildschirme. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Refreshable(
    refreshing: Boolean,
    onRefresh: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    PullToRefreshBox(
        isRefreshing = refreshing,
        onRefresh = onRefresh,
        modifier = modifier.fillMaxSize(),
    ) {
        content()
    }
}
