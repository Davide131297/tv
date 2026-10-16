package de.polittalkwatcher.app.ui.navigation

import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Tv
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Menu
import androidx.compose.material.icons.outlined.People
import androidx.compose.material.icons.outlined.Tv
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavDestination
import androidx.navigation.NavDestination.Companion.hasRoute
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import de.polittalkwatcher.app.ui.screens.EpisodesScreen
import de.polittalkwatcher.app.ui.screens.HomeScreen
import de.polittalkwatcher.app.ui.screens.MoreScreen
import de.polittalkwatcher.app.ui.screens.OverviewScreen
import de.polittalkwatcher.app.ui.screens.PartiesScreen
import de.polittalkwatcher.app.ui.screens.PoliticianDetailScreen
import de.polittalkwatcher.app.ui.screens.PoliticiansScreen
import de.polittalkwatcher.app.ui.screens.TopicsScreen
import de.polittalkwatcher.app.ui.screens.TvRatingsScreen
import kotlinx.serialization.Serializable
import kotlin.reflect.KClass

// ---------------------------------------------------------------------------
// Routen – spiegeln die Seitenstruktur der Web-Version wider
// ---------------------------------------------------------------------------

/** Start (Web: `/`). */
@Serializable data object HomeRoute

/** Parteien mit Unter-Tabs Übersicht / Zeitverlauf (Web: `/parteien`, `/parteien-zeitverlauf`). */
@Serializable data class PartiesRoute(val tab: Int = 0)

/** Politiker mit Unter-Tabs Datenbank / Rankings / Vergleich (Web: `/politiker`, `/politiker-rankings`, `/politiker/vergleich`). */
@Serializable data class PoliticiansRoute(val tab: Int = 0, val search: String? = null)

/** Sendungen (Web: `/sendungen`). */
@Serializable data object EpisodesRoute

/** Weitere Seiten und Infos. */
@Serializable data object MoreRoute

/** Übersicht (Web: `/uebersicht`). */
@Serializable data object OverviewRoute

/** Politische Themen (Web: `/politische-themen`). */
@Serializable data object TopicsRoute

/** Einschaltquoten (Web: `/einschaltquoten`). */
@Serializable data object TvRatingsRoute

/** Politiker-Detail (Web: `PoliticianModal`). */
@Serializable data class PoliticianDetailRoute(val name: String, val party: String? = null)

private data class TopLevelDestination(
    val label: String,
    val route: Any,
    val routeClass: KClass<*>,
    val selectedIcon: ImageVector,
    val icon: ImageVector,
)

private val TOP_LEVEL_DESTINATIONS = listOf(
    TopLevelDestination("Start", HomeRoute, HomeRoute::class, Icons.Filled.Home, Icons.Outlined.Home),
    TopLevelDestination("Parteien", PartiesRoute(), PartiesRoute::class, Icons.Filled.BarChart, Icons.Outlined.BarChart),
    TopLevelDestination("Politiker", PoliticiansRoute(), PoliticiansRoute::class, Icons.Filled.People, Icons.Outlined.People),
    TopLevelDestination("Sendungen", EpisodesRoute, EpisodesRoute::class, Icons.Filled.Tv, Icons.Outlined.Tv),
    TopLevelDestination("Mehr", MoreRoute, MoreRoute::class, Icons.Filled.Menu, Icons.Outlined.Menu),
)

private fun NavDestination?.isTopLevel(): Boolean =
    TOP_LEVEL_DESTINATIONS.any { dest -> this?.hierarchy?.any { it.hasRoute(dest.routeClass) } == true }

/** Wechselt zu einem Hauptbereich und behält dessen Zustand (Standard-Verhalten einer Bottom-Navigation). */
fun NavHostController.navigateToTopLevel(route: Any, restoreState: Boolean = true) {
    navigate(route) {
        popUpTo(graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        this.restoreState = restoreState
    }
}

@Composable
fun PolittalkNavHost() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentDestination = backStackEntry?.destination
    val showBottomBar = currentDestination == null || currentDestination.isTopLevel()

    val openPolitician: (String, String?) -> Unit = { name, party ->
        navController.navigate(PoliticianDetailRoute(name, party))
    }
    val back: () -> Unit = { navController.popBackStack() }

    Scaffold(
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    TOP_LEVEL_DESTINATIONS.forEach { dest ->
                        val selected = currentDestination?.hierarchy?.any { it.hasRoute(dest.routeClass) } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = { navController.navigateToTopLevel(dest.route) },
                            icon = { Icon(if (selected) dest.selectedIcon else dest.icon, contentDescription = null) },
                            label = { Text(dest.label) },
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = HomeRoute,
            modifier = Modifier.padding(bottom = innerPadding.calculateBottomPadding()),
            enterTransition = { fadeIn() + slideInHorizontally { it / 12 } },
            exitTransition = { fadeOut() },
            popEnterTransition = { fadeIn() },
            popExitTransition = { fadeOut() + slideOutHorizontally { it / 12 } },
        ) {
            composable<HomeRoute> {
                HomeScreen(
                    onOpenOverview = { navController.navigate(OverviewRoute) },
                    onOpenParties = { tab -> navController.navigateToTopLevel(PartiesRoute(tab), restoreState = false) },
                    onOpenPoliticians = { tab -> navController.navigateToTopLevel(PoliticiansRoute(tab), restoreState = false) },
                    onOpenEpisodes = { navController.navigateToTopLevel(EpisodesRoute) },
                    onOpenTopics = { navController.navigate(TopicsRoute) },
                    onOpenTvRatings = { navController.navigate(TvRatingsRoute) },
                    onOpenPolitician = openPolitician,
                )
            }
            composable<PartiesRoute> { entry ->
                PartiesScreen(initialTab = entry.toRoute<PartiesRoute>().tab)
            }
            composable<PoliticiansRoute> { entry ->
                val route = entry.toRoute<PoliticiansRoute>()
                PoliticiansScreen(
                    initialTab = route.tab,
                    initialSearch = route.search.orEmpty(),
                    onOpenPolitician = openPolitician,
                )
            }
            composable<EpisodesRoute> {
                EpisodesScreen(onOpenPolitician = openPolitician)
            }
            composable<MoreRoute> {
                MoreScreen(
                    onOpenOverview = { navController.navigate(OverviewRoute) },
                    onOpenTopics = { navController.navigate(TopicsRoute) },
                    onOpenTvRatings = { navController.navigate(TvRatingsRoute) },
                )
            }
            composable<OverviewRoute> { OverviewScreen(onBack = back) }
            composable<TopicsRoute> { TopicsScreen(onBack = back) }
            composable<TvRatingsRoute> { TvRatingsScreen(onBack = back, onOpenPolitician = openPolitician) }
            composable<PoliticianDetailRoute> { entry ->
                val route = entry.toRoute<PoliticianDetailRoute>()
                PoliticianDetailScreen(
                    name = route.name,
                    party = route.party,
                    onBack = back,
                    onCompare = { name ->
                        navController.navigateToTopLevel(PoliticiansRoute(tab = 2, search = name), restoreState = false)
                    },
                )
            }
        }
    }
}
