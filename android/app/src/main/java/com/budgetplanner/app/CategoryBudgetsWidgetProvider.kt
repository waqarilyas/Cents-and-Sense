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

class CategoryBudgetsWidgetProvider : AppWidgetProvider() {
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.widget_category_budgets)
        
        try {
            val widgetData = readWidgetData(context)
            val budgetsArray = widgetData.optJSONArray("categoryBudgets")
            val currency = widgetData.optString("currency", "$")
            
            if (budgetsArray != null && budgetsArray.length() > 0) {
                // Show up to 3 budgets
                for (i in 0 until minOf(3, budgetsArray.length())) {
                    val budget = budgetsArray.getJSONObject(i)
                    val category = budget.optString("category", "")
                    val spent = budget.optDouble("spent", 0.0)
                    val limit = budget.optDouble("limit", 1.0)
                    val percentage = if (limit > 0) ((spent / limit) * 100).toInt() else 0
                    
                    val statusText: String
                    val statusColor: Int
                    when {
                        percentage < 70 -> {
                            statusText = "On Track"
                            statusColor = android.graphics.Color.parseColor("#10B981")
                        }
                        percentage < 90 -> {
                            statusText = "Warning"
                            statusColor = android.graphics.Color.parseColor("#F59E0B")
                        }
                        else -> {
                            statusText = "Over Budget"
                            statusColor = android.graphics.Color.parseColor("#EF4444")
                        }
                    }
                    
                    when (i) {
                        0 -> {
                            views.setTextViewText(R.id.budget1_category, category)
                            views.setTextViewText(R.id.budget1_status, statusText)
                            views.setTextColor(R.id.budget1_status, statusColor)
                            views.setTextViewText(R.id.budget1_amounts, "${currency}${String.format("%.0f", spent)} / ${currency}${String.format("%.0f", limit)}")
                            views.setProgressBar(R.id.budget1_progress, 100, percentage, false)
                            views.setViewVisibility(R.id.budget1_container, View.VISIBLE)
                        }
                        1 -> {
                            views.setTextViewText(R.id.budget2_category, category)
                            views.setTextViewText(R.id.budget2_status, statusText)
                            views.setTextColor(R.id.budget2_status, statusColor)
                            views.setTextViewText(R.id.budget2_amounts, "${currency}${String.format("%.0f", spent)} / ${currency}${String.format("%.0f", limit)}")
                            views.setProgressBar(R.id.budget2_progress, 100, percentage, false)
                            views.setViewVisibility(R.id.budget2_container, View.VISIBLE)
                        }
                        2 -> {
                            views.setTextViewText(R.id.budget3_category, category)
                            views.setTextViewText(R.id.budget3_status, statusText)
                            views.setTextColor(R.id.budget3_status, statusColor)
                            views.setTextViewText(R.id.budget3_amounts, "${currency}${String.format("%.0f", spent)} / ${currency}${String.format("%.0f", limit)}")
                            views.setProgressBar(R.id.budget3_progress, 100, percentage, false)
                            views.setViewVisibility(R.id.budget3_container, View.VISIBLE)
                        }
                    }
                }
                
                // Hide unused budget containers
                if (budgetsArray.length() < 3) views.setViewVisibility(R.id.budget3_container, View.GONE)
                if (budgetsArray.length() < 2) views.setViewVisibility(R.id.budget2_container, View.GONE)
                if (budgetsArray.length() < 1) views.setViewVisibility(R.id.budget1_container, View.GONE)
            }
            
        } catch (e: Exception) {
            android.util.Log.e("CategoryBudgetsWidget", "Error updating widget", e)
        }
        
        // Set up deep link to open budgets screen
        val openBudgetsIntent = Intent(Intent.ACTION_VIEW, Uri.parse("budgetplanner://budgets"))
        val openBudgetsPendingIntent = PendingIntent.getActivity(
            context,
            0,
            openBudgetsIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_title, openBudgetsPendingIntent)
        
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
            android.util.Log.e("CategoryBudgetsWidget", "Error reading widget data", e)
            JSONObject()
        }
    }
    
    companion object {
        fun updateAllWidgets(context: Context) {
            val intent = Intent(context, CategoryBudgetsWidgetProvider::class.java)
            intent.action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
            val ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(android.content.ComponentName(context, CategoryBudgetsWidgetProvider::class.java))
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            context.sendBroadcast(intent)
        }
    }
}
