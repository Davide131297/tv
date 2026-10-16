package de.polittalkwatcher.app.ui.theme

import androidx.compose.ui.graphics.Color

// Markenfarben – angelehnt an das Tailwind-Farbschema des Web-Frontends (blue-600 als Akzent).
val Blue600 = Color(0xFF2563EB)
val Blue400 = Color(0xFF60A5FA)
val Blue100 = Color(0xFFDBEAFE)
val Blue900 = Color(0xFF1E3A8A)

val Gray50 = Color(0xFFF9FAFB)
val Gray100 = Color(0xFFF3F4F6)
val Gray200 = Color(0xFFE5E7EB)
val Gray400 = Color(0xFF9CA3AF)
val Gray500 = Color(0xFF6B7280)
val Gray600 = Color(0xFF4B5563)
val Gray800 = Color(0xFF1F2937)
val Gray900 = Color(0xFF111827)
val Gray950 = Color(0xFF030712)

/** Farbpaar (Hintergrund + Text) für Kennzahl-Kacheln, wie `ColorBox` im Web. */
data class TileColors(val container: Color, val content: Color)

enum class Accent(val light: TileColors, val dark: TileColors) {
    Blue(
        TileColors(Color(0xFFEFF6FF), Color(0xFF1D4ED8)),
        TileColors(Color(0xFF172554), Color(0xFF60A5FA)),
    ),
    Green(
        TileColors(Color(0xFFF0FDF4), Color(0xFF15803D)),
        TileColors(Color(0xFF052E16), Color(0xFF4ADE80)),
    ),
    Purple(
        TileColors(Color(0xFFFAF5FF), Color(0xFF7E22CE)),
        TileColors(Color(0xFF3B0764), Color(0xFFC084FC)),
    ),
    Orange(
        TileColors(Color(0xFFFFF7ED), Color(0xFFC2410C)),
        TileColors(Color(0xFF431407), Color(0xFFFB923C)),
    ),
    Yellow(
        TileColors(Color(0xFFFEFCE8), Color(0xFFA16207)),
        TileColors(Color(0xFF422006), Color(0xFFFACC15)),
    ),
    Teal(
        TileColors(Color(0xFFF0FDFA), Color(0xFF0F766E)),
        TileColors(Color(0xFF042F2E), Color(0xFF2DD4BF)),
    ),
    Rose(
        TileColors(Color(0xFFFFF1F2), Color(0xFFBE123C)),
        TileColors(Color(0xFF4C0519), Color(0xFFFB7185)),
    ),
    Emerald(
        TileColors(Color(0xFFECFDF5), Color(0xFF047857)),
        TileColors(Color(0xFF022C22), Color(0xFF34D399)),
    );

    fun colors(dark: Boolean) = if (dark) this.dark else light
}
