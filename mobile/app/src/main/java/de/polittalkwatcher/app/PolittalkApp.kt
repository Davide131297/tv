package de.polittalkwatcher.app

import android.app.Application
import de.polittalkwatcher.app.data.AppContainer

class PolittalkApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer()
    }
}
