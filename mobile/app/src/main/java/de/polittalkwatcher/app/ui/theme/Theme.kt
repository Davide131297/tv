package de.polittalkwatcher.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

private val LightColors = lightColorScheme(
    primary = Blue600,
    onPrimary = Color.White,
    primaryContainer = Blue100,
    onPrimaryContainer = Blue900,
    secondary = Gray600,
    onSecondary = Color.White,
    secondaryContainer = Gray100,
    onSecondaryContainer = Gray900,
    background = Gray50,
    onBackground = Gray900,
    surface = Gray50,
    onSurface = Gray900,
    surfaceVariant = Gray100,
    onSurfaceVariant = Gray600,
    surfaceContainerLowest = Color.White,
    surfaceContainerLow = Color.White,
    surfaceContainer = Color.White,
    surfaceContainerHigh = Gray100,
    surfaceContainerHighest = Gray200,
    outline = Gray400,
    outlineVariant = Gray200,
)

private val DarkColors = darkColorScheme(
    primary = Blue400,
    onPrimary = Gray950,
    primaryContainer = Blue900,
    onPrimaryContainer = Blue100,
    secondary = Gray400,
    onSecondary = Gray950,
    secondaryContainer = Gray800,
    onSecondaryContainer = Gray100,
    background = Gray950,
    onBackground = Gray100,
    surface = Gray950,
    onSurface = Gray100,
    surfaceVariant = Gray800,
    onSurfaceVariant = Gray400,
    surfaceContainerLowest = Gray950,
    surfaceContainerLow = Color(0xFF0B1120),
    surfaceContainer = Gray900,
    surfaceContainerHigh = Gray800,
    surfaceContainerHighest = Color(0xFF374151),
    outline = Gray500,
    outlineVariant = Gray800,
)

/** Gibt an, ob gerade das dunkle Theme aktiv ist (für Partei-/Kachelfarben). */
val LocalDarkTheme = staticCompositionLocalOf { false }

@Composable
fun PolittalkTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalDarkTheme provides darkTheme) {
        MaterialTheme(
            colorScheme = if (darkTheme) DarkColors else LightColors,
            typography = Typography(),
            content = content,
        )
    }
}
