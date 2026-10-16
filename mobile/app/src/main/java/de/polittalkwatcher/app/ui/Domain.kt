package de.polittalkwatcher.app.ui

import androidx.compose.ui.graphics.Color
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

/** Sendungs-Filter wie `SHOW_OPTIONS` im Web-Frontend (frontend/types.ts). */
data class ShowOption(
    val value: String,
    val label: String,
    val container: Color,
    val content: Color,
)

val SHOW_OPTIONS = listOf(
    ShowOption("all", "Alle Shows", Color(0xFF111827), Color.White),
    ShowOption("Markus Lanz", "Markus Lanz", Color(0xFFFFEDD5), Color(0xFF9A3412)),
    ShowOption("Maybrit Illner", "Maybrit Illner", Color(0xFFF3E8FF), Color(0xFF6B21A8)),
    ShowOption("Caren Miosga", "Caren Miosga", Color(0xFFDCFCE7), Color(0xFF166534)),
    ShowOption("Maischberger", "Maischberger", Color(0xFFCCFBF1), Color(0xFF115E59)),
    ShowOption("Hart aber fair", "Hart aber fair", Color(0xFFDBEAFE), Color(0xFF1E40AF)),
)

val SHOW_OPTIONS_WITHOUT_ALL = SHOW_OPTIONS.filter { it.value != "all" }

fun showOption(name: String): ShowOption? =
    SHOW_OPTIONS.firstOrNull { it.value.equals(name, ignoreCase = true) }

fun showLabel(value: String): String = showOption(value)?.label ?: value

/** Jahresauswahl wie `useYearList(2024)` im Web: aktuelles Jahr absteigend bis 2024, dazu "Insgesamt". */
const val ALL_YEARS = "all"
private const val FIRST_YEAR = 2024

val currentYear: String get() = LocalDate.now().year.toString()

fun yearOptions(): List<String> =
    listOf(ALL_YEARS) + (LocalDate.now().year downTo FIRST_YEAR).map { it.toString() }

fun yearLabel(year: String): String = if (year == ALL_YEARS) "Insgesamt" else year

// ---------------------------------------------------------------------------
// Parteifarben (frontend/types.ts → PARTY_COLORS)
// ---------------------------------------------------------------------------

private fun normalizeParty(name: String): String =
    name.replace(Regex("[\u00AD\u200B-\u200D\uFEFF]"), "").replace(Regex("\\s+"), " ").trim()

private val PARTY_COLORS = mapOf(
    "CDU" to Color(0xFF000000),
    "CSU" to Color(0xFF1E40AF),
    "UNION" to Color(0xFF1E293B),
    "SPD" to Color(0xFFDC2626),
    "FDP" to Color(0xFFFACC15),
    "DIE LINKE" to Color(0xFFDF007D),
    "BÜNDNIS 90/DIE GRÜNEN" to Color(0xFF22C55E),
    "GRÜNE" to Color(0xFF22C55E),
    "AFD" to Color(0xFF2563EB),
    "BSW" to Color(0xFFA16207),
    "PARTEILOS" to Color(0xFF6B7280),
    "ÖVP" to Color(0xFF63C3D0),
    "FREIE WÄHLER" to Color(0xFFF97316),
)

private val FALLBACK_PALETTE = listOf(
    Color(0xFF8B5CF6), Color(0xFF14B8A6), Color(0xFFEC4899), Color(0xFF84CC16),
    Color(0xFF0EA5E9), Color(0xFFF59E0B),
)

/** Volle Parteifarbe für Diagramme. Schwarz (CDU) wird im Dark Mode aufgehellt. */
fun partyColor(party: String?, dark: Boolean = false): Color {
    val key = normalizeParty(party.orEmpty()).uppercase(Locale.GERMAN)
    val color = PARTY_COLORS[key]
        ?: FALLBACK_PALETTE[(key.hashCode() and Int.MAX_VALUE) % FALLBACK_PALETTE.size]
    return if (dark && (key == "CDU" || key == "UNION")) Color(0xFF9CA3AF) else color
}

/** Textfarbe auf einer vollen Parteifarbe. */
fun onPartyColor(party: String?): Color {
    val key = normalizeParty(party.orEmpty()).uppercase(Locale.GERMAN)
    return if (key == "FDP" || key == "BÜNDNIS 90/DIE GRÜNEN" || key == "GRÜNE") Color.Black else Color.White
}

/** Kurzname für enge Stellen (Legenden, Chips). */
fun partyShortName(party: String): String = when (normalizeParty(party).uppercase(Locale.GERMAN)) {
    "BÜNDNIS 90/DIE GRÜNEN" -> "Grüne"
    else -> party
}

// ---------------------------------------------------------------------------
// Formatierung (de-DE)
// ---------------------------------------------------------------------------

private val isoDate = DateTimeFormatter.ISO_LOCAL_DATE
private val germanDate = DateTimeFormatter.ofPattern("dd.MM.yyyy", Locale.GERMANY)
private val germanLongDate = DateTimeFormatter.ofPattern("EEEE, d. MMMM yyyy", Locale.GERMANY)
private val monthShort = DateTimeFormatter.ofPattern("MMM yy", Locale.GERMANY)

fun formatDate(iso: String?): String = runCatching {
    LocalDate.parse(iso?.take(10), isoDate).format(germanDate)
}.getOrDefault(iso.orEmpty())

fun formatLongDate(iso: String?): String = runCatching {
    LocalDate.parse(iso?.take(10), isoDate).format(germanLongDate)
}.getOrDefault(iso.orEmpty())

/** "2026-03" → "Mär 26"; "03" → "Mär". */
fun formatMonth(value: String): String = runCatching {
    if (value.length == 7) {
        LocalDate.parse("$value-01", isoDate).format(monthShort)
    } else {
        LocalDate.of(2000, value.toInt(), 1).format(DateTimeFormatter.ofPattern("MMM", Locale.GERMANY))
    }
}.getOrDefault(value)

private val decimal1 = NumberFormat.getNumberInstance(Locale.GERMANY).apply {
    minimumFractionDigits = 1
    maximumFractionDigits = 1
}
private val decimal2 = NumberFormat.getNumberInstance(Locale.GERMANY).apply {
    minimumFractionDigits = 0
    maximumFractionDigits = 2
}
private val integer = NumberFormat.getIntegerInstance(Locale.GERMANY)

fun Double.format1(): String = decimal1.format(this)
fun Double.format2(): String = decimal2.format(this)
fun Int.formatInt(): String = integer.format(this)

fun percent(part: Int, total: Int): String =
    if (total <= 0) "0,0 %" else "${(part * 100.0 / total).format1()} %"
