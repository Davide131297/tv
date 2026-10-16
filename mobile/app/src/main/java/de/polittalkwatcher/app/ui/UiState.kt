package de.polittalkwatcher.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import de.polittalkwatcher.app.PolittalkApp
import de.polittalkwatcher.app.data.PolittalkRepository
import kotlinx.coroutines.CancellationException
import retrofit2.HttpException
import java.io.IOException

/** Ladezustand eines Bildschirms. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

val <T> UiState<T>.dataOrNull: T? get() = (this as? UiState.Success)?.data

/** Führt einen API-Aufruf aus und übersetzt Fehler in verständliche Meldungen. */
suspend fun <T> loadState(block: suspend () -> T): UiState<T> = try {
    UiState.Success(block())
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    UiState.Error(e.toUserMessage())
}

fun Throwable.toUserMessage(): String = when (this) {
    is IOException -> "Keine Verbindung zum Server. Bitte Internetverbindung prüfen."
    is HttpException -> "Der Server antwortete mit Fehler ${code()}."
    else -> "Daten konnten nicht geladen werden."
}

/** Erstellt ein ViewModel mit Zugriff auf das zentrale Repository. */
@Composable
inline fun <reified VM : ViewModel> appViewModel(
    key: String? = null,
    crossinline create: (PolittalkRepository) -> VM,
): VM {
    val app = LocalContext.current.applicationContext as PolittalkApp
    return viewModel(
        key = key,
        factory = viewModelFactory { initializer { create(app.container.repository) } },
    )
}
