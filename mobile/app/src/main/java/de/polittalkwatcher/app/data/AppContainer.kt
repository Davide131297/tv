package de.polittalkwatcher.app.data

import de.polittalkwatcher.app.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

/** JSON-Konfiguration für die API: tolerant gegenüber neuen Feldern und `null`-Werten. */
internal val PolittalkJson = Json {
    ignoreUnknownKeys = true
    coerceInputValues = true
    explicitNulls = false
}

/** Einfache manuelle Dependency Injection – wird einmal in [de.polittalkwatcher.app.PolittalkApp] erzeugt. */
class AppContainer {

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        // Einige Aggregationen (z.B. Rankings über alle Jahre) brauchen serverseitig etwas länger.
        .readTimeout(45, TimeUnit.SECONDS)
        .apply {
            if (BuildConfig.DEBUG) {
                addInterceptor(HttpLoggingInterceptor().setLevel(HttpLoggingInterceptor.Level.BASIC))
            }
        }
        .build()

    private val api: PolittalkApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(httpClient)
        .addConverterFactory(PolittalkJson.asConverterFactory("application/json".toMediaType()))
        .build()
        .create(PolittalkApi::class.java)

    val repository = PolittalkRepository(api)
}
