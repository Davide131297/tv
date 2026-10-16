package de.polittalkwatcher.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.drawText
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.roundToInt

data class ChartDatum(
    val label: String,
    val value: Float,
    val color: Color,
    val valueText: String = value.roundToInt().toString(),
)

/**
 * Horizontales Balkendiagramm. Auf dem Smartphone besser lesbar als die vertikalen
 * Balken der Web-Version, da lange Beschriftungen (Parteien, Themen) voll sichtbar bleiben.
 */
@Composable
fun HorizontalBarChart(
    data: List<ChartDatum>,
    modifier: Modifier = Modifier,
    labelAbove: Boolean = false,
) {
    val maxValue = data.maxOfOrNull { it.value }?.takeIf { it > 0f } ?: 1f
    Column(modifier, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        data.forEach { datum ->
            val target = datum.value / maxValue
            val fraction by animateFloatAsState(
                targetValue = target,
                animationSpec = tween(600, easing = FastOutSlowInEasing),
                label = "bar",
            )
            if (labelAbove) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            datum.label,
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                        Spacer(Modifier.width(8.dp))
                        Text(datum.valueText, style = MaterialTheme.typography.labelLarge, fontWeight = FontWeight.SemiBold)
                    }
                    Spacer(Modifier.height(4.dp))
                    Bar(fraction, datum.color, Modifier.fillMaxWidth())
                }
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        datum.label,
                        style = MaterialTheme.typography.bodySmall,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.width(92.dp),
                    )
                    Bar(fraction, datum.color, Modifier.weight(1f))
                    Text(
                        datum.valueText,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(start = 8.dp).width(56.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun Bar(fraction: Float, color: Color, modifier: Modifier) {
    Box(
        modifier
            .height(14.dp)
            .clip(RoundedCornerShape(7.dp))
            .background(MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Box(
            Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .clip(RoundedCornerShape(7.dp))
                .background(color),
        )
    }
}

/** Ringdiagramm mit Legende (Web: Kreisdiagramm in `PartyChart`). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DonutChart(
    data: List<ChartDatum>,
    centerLabel: String,
    centerValue: String,
    modifier: Modifier = Modifier,
) {
    val total = data.sumOf { it.value.toDouble() }.toFloat().takeIf { it > 0f } ?: 1f
    val progress = remember(data) { Animatable(0f) }
    LaunchedEffect(data) { progress.animateTo(1f, tween(800, easing = FastOutSlowInEasing)) }
    val trackColor = MaterialTheme.colorScheme.surfaceVariant

    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Box(Modifier.fillMaxWidth(0.7f).aspectRatio(1f), contentAlignment = Alignment.Center) {
            Canvas(Modifier.fillMaxWidth().aspectRatio(1f)) {
                val stroke = size.minDimension * 0.16f
                val arcSize = Size(size.width - stroke, size.height - stroke)
                val topLeft = Offset(stroke / 2, stroke / 2)
                drawArc(trackColor, 0f, 360f, false, topLeft, arcSize, style = Stroke(stroke))
                var start = -90f
                data.forEach { datum ->
                    val sweep = datum.value / total * 360f * progress.value
                    drawArc(
                        color = datum.color,
                        startAngle = start,
                        sweepAngle = (sweep - 0.8f).coerceAtLeast(0.1f),
                        useCenter = false,
                        topLeft = topLeft,
                        size = arcSize,
                        style = Stroke(stroke, cap = StrokeCap.Butt),
                    )
                    start += sweep
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(centerValue, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Text(centerLabel, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        Spacer(Modifier.height(16.dp))
        FlowRow(
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            data.forEach { LegendItem(it.label, it.color) }
        }
    }
}

@Composable
fun LegendItem(label: String, color: Color, modifier: Modifier = Modifier, dimmed: Boolean = false) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically) {
        Box(
            Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(if (dimmed) color.copy(alpha = 0.25f) else color),
        )
        Spacer(Modifier.width(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (dimmed) MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f) else MaterialTheme.colorScheme.onSurface,
        )
    }
}

data class LineSeries(val name: String, val color: Color, val values: List<Int>)

/**
 * Liniendiagramm für den Zeitverlauf (Web: `PartyTimelineChart`).
 * Antippen bzw. Wischen zeigt die Werte des gewählten Monats.
 */
@Composable
fun LineChart(
    xLabels: List<String>,
    series: List<LineSeries>,
    modifier: Modifier = Modifier,
) {
    if (xLabels.isEmpty() || series.isEmpty()) return
    val textMeasurer = rememberTextMeasurer()
    val axisColor = MaterialTheme.colorScheme.outlineVariant
    val labelColor = MaterialTheme.colorScheme.onSurfaceVariant
    val highlightColor = MaterialTheme.colorScheme.onSurface
    val labelStyle = TextStyle(fontSize = 10.sp, color = labelColor)
    var selectedIndex by remember(xLabels) { mutableIntStateOf(-1) }

    val rawMax = series.maxOf { s -> s.values.maxOrNull() ?: 0 }.coerceAtLeast(1)
    val step = niceStep(rawMax)
    val yMax = (ceil(rawMax / step.toDouble()) * step).toInt().coerceAtLeast(step)

    val progress = remember(series) { Animatable(0f) }
    LaunchedEffect(series) { progress.animateTo(1f, tween(900, easing = FastOutSlowInEasing)) }

    Column(modifier) {
        Canvas(
            Modifier
                .fillMaxWidth()
                .height(240.dp)
                .pointerInput(xLabels) {
                    detectTapGestures { offset ->
                        selectedIndex = indexForX(offset.x, LEFT_AXIS_PX.dp.toPx(), size.width - (LEFT_AXIS_PX + 8).dp.toPx(), xLabels.size)
                    }
                }
                .pointerInput(xLabels) {
                    detectHorizontalDragGestures { change, _ ->
                        selectedIndex = indexForX(change.position.x, LEFT_AXIS_PX.dp.toPx(), size.width - (LEFT_AXIS_PX + 8).dp.toPx(), xLabels.size)
                    }
                },
        ) {
            val left = LEFT_AXIS_PX.dp.toPx()
            val bottom = size.height - 22.dp.toPx()
            val top = 8.dp.toPx()
            val width = size.width - left - 8.dp.toPx()
            val height = bottom - top

            // Y-Achse mit Hilfslinien
            var y = 0
            while (y <= yMax) {
                val py = bottom - height * y / yMax
                drawLine(
                    axisColor, Offset(left, py), Offset(left + width, py), 1f,
                    pathEffect = PathEffect.dashPathEffect(floatArrayOf(8f, 8f)),
                )
                val layout = textMeasurer.measure(y.toString(), labelStyle)
                drawText(layout, topLeft = Offset(left - layout.size.width - 6.dp.toPx(), py - layout.size.height / 2))
                y += step
            }

            fun xFor(i: Int) = if (xLabels.size == 1) left + width / 2 else left + width * i / (xLabels.size - 1)

            // X-Beschriftung (ausgedünnt, damit nichts überlappt)
            val every = max(1, ceil(xLabels.size / 6.0).toInt())
            xLabels.forEachIndexed { i, label ->
                if (i % every == 0 || i == xLabels.lastIndex && xLabels.size <= 12) {
                    val layout = textMeasurer.measure(label, labelStyle)
                    val x = (xFor(i) - layout.size.width / 2).coerceIn(0f, size.width - layout.size.width)
                    drawText(layout, topLeft = Offset(x, bottom + 6.dp.toPx()))
                }
            }

            if (selectedIndex in xLabels.indices) {
                drawLine(highlightColor.copy(alpha = 0.4f), Offset(xFor(selectedIndex), top), Offset(xFor(selectedIndex), bottom), 2f)
            }

            series.forEach { s ->
                val path = Path()
                s.values.forEachIndexed { i, v ->
                    val px = xFor(i)
                    val py = bottom - height * (v * progress.value) / yMax
                    if (i == 0) path.moveTo(px, py) else path.lineTo(px, py)
                }
                drawPath(path, s.color, style = Stroke(width = 2.5.dp.toPx(), cap = StrokeCap.Round))
                if (selectedIndex in s.values.indices) {
                    val v = s.values[selectedIndex]
                    drawCircle(s.color, 4.dp.toPx(), Offset(xFor(selectedIndex), bottom - height * v / yMax))
                }
            }
        }

        if (selectedIndex in xLabels.indices) {
            Spacer(Modifier.height(8.dp))
            Text(
                xLabels[selectedIndex],
                style = MaterialTheme.typography.labelLarge,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(4.dp))
            series
                .sortedByDescending { it.values.getOrElse(selectedIndex) { 0 } }
                .forEach { s ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 1.dp), verticalAlignment = Alignment.CenterVertically) {
                        LegendItem(s.name, s.color, Modifier.weight(1f))
                        Text(
                            s.values.getOrElse(selectedIndex) { 0 }.toString(),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
        } else {
            Spacer(Modifier.height(4.dp))
            Text(
                "Tippe auf das Diagramm, um die Werte eines Monats zu sehen.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

private const val LEFT_AXIS_PX = 28

private fun indexForX(x: Float, left: Float, plotWidth: Float, count: Int): Int {
    if (count <= 1 || plotWidth <= 0f) return 0
    val fraction = ((x - left) / plotWidth).coerceIn(0f, 1f)
    return (fraction * (count - 1)).roundToInt()
}

private fun niceStep(max: Int): Int = when {
    max <= 5 -> 1
    max <= 10 -> 2
    max <= 25 -> 5
    max <= 50 -> 10
    max <= 100 -> 20
    max <= 250 -> 50
    else -> 100
}
