package de.polittalkwatcher.app.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test
import java.time.LocalDate

class DomainTest {

    @Test
    fun `Datumsformat entspricht de-DE`() {
        assertEquals("15.10.2026", formatDate("2026-10-15"))
        assertEquals("Donnerstag, 15. Oktober 2026", formatLongDate("2026-10-15"))
        assertEquals("kein-datum", formatDate("kein-datum"))
    }

    @Test
    fun `Jahresliste beginnt mit Insgesamt und reicht bis 2024`() {
        val years = yearOptions()
        assertEquals(ALL_YEARS, years.first())
        assertEquals(LocalDate.now().year.toString(), years[1])
        assertEquals("2024", years.last())
        assertEquals("Insgesamt", yearLabel(ALL_YEARS))
    }

    @Test
    fun `Parteifarben ignorieren Schreibweise und unsichtbare Zeichen`() {
        assertEquals(partyColor("SPD"), partyColor("spd"))
        assertEquals(partyColor("Die Linke"), partyColor("Die\u00AD Linke"))
        // CDU ist im Dark Mode nicht schwarz, damit sie auf dunklem Hintergrund sichtbar bleibt.
        assertNotEquals(partyColor("CDU", dark = false), partyColor("CDU", dark = true))
        assertEquals("Grüne", partyShortName("BÜNDNIS 90/DIE GRÜNEN"))
    }

    @Test
    fun `Sendungsnamen werden unabhaengig von Gross- und Kleinschreibung erkannt`() {
        // Die Quoten-API liefert z.B. "maybrit illner" in Kleinbuchstaben.
        assertEquals("Maybrit Illner", showLabel("maybrit illner"))
        assertEquals("Unbekannte Show", showLabel("Unbekannte Show"))
    }

    @Test
    fun `Prozentwerte im deutschen Format`() {
        assertEquals("25,0 %", percent(1, 4))
        assertEquals("0,0 %", percent(1, 0))
    }
}
