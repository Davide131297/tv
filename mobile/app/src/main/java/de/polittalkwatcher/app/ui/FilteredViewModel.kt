package de.polittalkwatcher.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/**
 * Basis für Bildschirme mit Sendungs- und Jahresfilter (wie die URL-Parameter `show` und `year` im Web).
 * Unterklassen rufen [load] in ihrem `init`-Block auf.
 */
abstract class FilteredViewModel<T>(
    initialShow: String = "all",
    initialYear: String = currentYear,
) : ViewModel() {

    private val _show = MutableStateFlow(initialShow)
    val show: StateFlow<String> = _show.asStateFlow()

    private val _year = MutableStateFlow(initialYear)
    val year: StateFlow<String> = _year.asStateFlow()

    private val _state = MutableStateFlow<UiState<T>>(UiState.Loading)
    val state: StateFlow<UiState<T>> = _state.asStateFlow()

    /** true, solange bei bereits angezeigten Daten neu geladen wird (Pull-to-Refresh / Filterwechsel). */
    private val _refreshing = MutableStateFlow(false)
    val refreshing: StateFlow<Boolean> = _refreshing.asStateFlow()

    private var job: Job? = null

    protected abstract suspend fun fetch(show: String, year: String): T

    fun setShow(value: String) {
        if (value == _show.value) return
        _show.value = value
        load()
    }

    fun setYear(value: String) {
        if (value == _year.value) return
        _year.value = value
        load()
    }

    fun refresh() = load()

    protected fun load() {
        job?.cancel()
        job = viewModelScope.launch {
            if (_state.value is UiState.Success) _refreshing.value = true else _state.value = UiState.Loading
            _state.value = loadState { fetch(_show.value, _year.value) }
            _refreshing.value = false
        }
    }
}
