package de.polittalkwatcher.app.ui.screens

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.OpenInNew
import androidx.compose.material.icons.outlined.AccountBalance
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.Gavel
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Storage
import androidx.compose.material.icons.outlined.Tv
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.ListItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.unit.dp
import de.polittalkwatcher.app.BuildConfig
import de.polittalkwatcher.app.ui.components.ScreenScaffold
import androidx.compose.foundation.clickable

private const val WEBSITE = "https://polittalk-watcher.de"

/** Weitere Bereiche der Web-Navigation sowie Links auf Web-only-Seiten. */
@Composable
fun MoreScreen(
    onOpenOverview: () -> Unit,
    onOpenTopics: () -> Unit,
    onOpenTvRatings: () -> Unit,
) {
    val uriHandler = LocalUriHandler.current
    ScreenScaffold(title = "Mehr") { padding ->
        LazyColumn(Modifier.padding(padding), contentPadding = PaddingValues(bottom = 24.dp)) {
            item { Header("Analysen") }
            item { Entry(Icons.Outlined.Dashboard, "Übersicht", "Gesamtstatistiken und Durchschnittswerte", onClick = onOpenOverview) }
            item { Entry(Icons.Outlined.AccountBalance, "Politische Themen", "Welche Themen in Talkshows dominieren", onClick = onOpenTopics) }
            item { Entry(Icons.Outlined.Tv, "Einschaltquoten", "TV-Quoten zu Episoden, Politikern und Parteien", onClick = onOpenTvRatings) }

            item { HorizontalDivider(Modifier.padding(vertical = 8.dp)) }
            item { Header("Im Web") }
            item { Entry(Icons.Outlined.Language, "Website öffnen", "polittalk-watcher.de", external = true) { uriHandler.openUri(WEBSITE) } }
            item { Entry(Icons.Outlined.Storage, "Datenbank", "Alle Rohdaten als Tabelle", external = true) { uriHandler.openUri("$WEBSITE/datenbank") } }
            item { Entry(Icons.Outlined.Code, "API-Dokumentation", "Öffentliche Schnittstelle /api/v1", external = true) { uriHandler.openUri("$WEBSITE/api-docs") } }
            item { Entry(Icons.Outlined.Gavel, "Impressum", null, external = true) { uriHandler.openUri("$WEBSITE/impressum") } }
            item { Entry(Icons.Outlined.PrivacyTip, "Datenschutz", null, external = true) { uriHandler.openUri("$WEBSITE/datenschutz") } }

            item {
                Text(
                    "Polittalk-Watcher für Android · Version ${BuildConfig.VERSION_NAME}\n" +
                        "Daten: polittalk-watcher.de · Politiker-Abgleich via abgeordnetenwatch.de",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(16.dp),
                )
            }
        }
    }
}

@Composable
private fun Header(text: String) {
    Text(
        text,
        style = MaterialTheme.typography.labelLarge,
        color = MaterialTheme.colorScheme.primary,
        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
    )
}

@Composable
private fun Entry(
    icon: ImageVector,
    title: String,
    subtitle: String?,
    external: Boolean = false,
    onClick: () -> Unit,
) {
    ListItem(
        modifier = Modifier.clickable(onClick = onClick),
        headlineContent = { Text(title) },
        supportingContent = subtitle?.let { { Text(it) } },
        leadingContent = { Icon(icon, contentDescription = null) },
        trailingContent = {
            Icon(
                if (external) Icons.AutoMirrored.Filled.OpenInNew else Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
            )
        },
    )
}
