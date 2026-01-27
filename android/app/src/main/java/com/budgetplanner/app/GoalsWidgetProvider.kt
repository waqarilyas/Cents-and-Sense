package com.budgetplanner.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File

class GoalsWidgetProvider : AppWidgetProvider() {
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_goals)
        
        try {
            val widgetData = readWidgetData(context)
            val goalsArray = widgetData.optJSONArray("goals")
            val currency = widgetData.optString("currency", "$")
            
            if (goalsArray != null && goalsArray.length() > 0) {
                // Show up to 3 goals
                for (i in 0 until minOf(3, goalsArray.length())) {
                    val goal = goalsArray.getJSONObject(i)
                    val name = goal.optString("name", "")
                    val current = goal.optDouble("currentAmount", 0.0)
                    val target = goal.optDouble("targetAmount", 1.0)
                    val percentage = if (target > 0) ((current / target) * 100).toInt() else 0
                    
                    when (i) {
                        0 -> {
                            views.setTextViewText(R.id.goal1_name, name)
                            views.setTextViewText(R.id.goal1_percentage, "$percentage%")
                            views.setTextViewText(R.id.goal1_progress, "${currency}${String.format("%.0f", current)} / ${currency}${String.format("%.0f", target)}")
                            views.setProgressBar(R.id.goal1_progress_bar, 100, percentage, false)
                            views.setViewVisibility(R.id.goal1_container, View.VISIBLE)
                        }
                        1 -> {
                            views.setTextViewText(R.id.goal2_name, name)
                            views.setTextViewText(R.id.goal2_percentage, "$percentage%")
                            views.setTextViewText(R.id.goal2_progress, "${currency}${String.format("%.0f", current)} / ${currency}${String.format("%.0f", target)}")
                            views.setProgressBar(R.id.goal2_progress_bar, 100, percentage, false)
                            views.setViewVisibility(R.id.goal2_container, View.VISIBLE)
                        }
                        2 -> {
                            views.setTextViewText(R.id.goal3_name, name)
                            views.setTextViewText(R.id.goal3_percentage, "$percentage%")
                            views.setTextViewText(R.id.goal3_progress, "${currency}${String.format("%.0f", current)} / ${currency}${String.format("%.0f", target)}")
                            views.setProgressBar(R.id.goal3_progress_bar, 100, percentage, false)
                            views.setViewVisibility(R.id.goal3_container, View.VISIBLE)
                        }
                    }
                }
                
                // Hide unused goal containers
                if (goalsArray.length() < 3) views.setViewVisibility(R.id.goal3_container, View.GONE)
                if (goalsArray.length() < 2) views.setViewVisibility(R.id.goal2_container, View.GONE)
                if (goalsArray.length() < 1) views.setViewVisibility(R.id.goal1_container, View.GONE)
            }
            
        } catch (e: Exception) {
            android.util.Log.e("GoalsWidget", "Error updating widget", e)
        }
        
        // Set up deep link for add goal button
        val addGoalIntent = Intent(Intent.ACTION_VIEW, Uri.parse("budgetplanner://goals"))
        val addGoalPendingIntent = PendingIntent.getActivity(
            context,
            0,
            addGoalIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.add_goal_button, addGoalPendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun readWidgetData(context: Context): JSONObject {
        return try {
            val file = File(context.filesDir, "widget_data.json")
            if (file.exists()) {
                val jsonString = file.readText()
                JSONObject(jsonString)
            } else {
                JSONObject()
            }
        } catch (e: Exception) {
            android.util.Log.e("GoalsWidget", "Error reading widget data", e)
            JSONObject()
        }
    }
    
    companion object {
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, GoalsWidgetProvider::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(android.content.ComponentName(context, GoalsWidgetProvider::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
