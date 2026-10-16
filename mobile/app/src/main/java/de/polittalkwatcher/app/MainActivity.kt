package de.polittalkwatcher.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import de.polittalkwatcher.app.ui.navigation.PolittalkNavHost
import de.polittalkwatcher.app.ui.theme.PolittalkTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            PolittalkTheme {
                PolittalkNavHost()
            }
        }
    }
}
