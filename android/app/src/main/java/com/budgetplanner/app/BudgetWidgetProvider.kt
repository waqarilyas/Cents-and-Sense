package com.centsandsense.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.io.File

open class BudgetWidgetProvider : AppWidgetProvider() {
    
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    protected open fun getLayoutResourceId(): Int = R.layout.widget_spending
    
    private fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, getLayoutResourceId())
        
        try {
            val widgetData = readWidgetData(context)
            
            // Extract data
            val spending = widgetData.optDouble("currentSpending", 0.0)
            val budget = widgetData.optDouble("monthlyBudget", 0.0)
            val currency = widgetData.optString("currency", "$")
            val remaining = budget - spending
            
            // Calculate stats
            val calendar = java.util.Calendar.getInstance()
            val currentDay = calendar.get(java.util.Calendar.DAY_OF_MONTH)
            val daysInMonth = calendar.getActualMaximum(java.util.Calendar.DAY_OF_MONTH)
            val daysLeft = daysInMonth - currentDay + 1
            val dailyAvg = if (currentDay > 0) spending / currentDay else 0.0
            
            // Update main amounts
            views.setTextViewText(R.id.spending_amount, "${currency}${String.format("%.2f", spending)}")
            views.setTextViewText(R.id.budget_amount, " / ${currency}${String.format("%.2f", budget)}")
            views.setTextViewText(R.id.remaining_amount, "${currency}${String.format("%.2f", remaining)} remaining")
            
            // Update budget status
            val statusText: String
            val statusColor: Int
            val progress = if (budget > 0) ((spending / budget) * 100).toInt() else 0
            
            when {
                progress < 70 -> {
                    statusText = "On Track"
                    statusColor = android.graphics.Color.parseColor("#10B981")
                }
                progress < 90 -> {
                    statusText = "Watch It"
                    statusColor = android.graphics.Color.parseColor("#F59E0B")
                }
                else -> {
                    statusText = "Over Budget"
                    statusColor = android.graphics.Color.parseColor("#EF4444")
                }
            }
            views.setTextViewText(R.id.budget_status, statusText)
            views.setTextColor(R.id.budget_status, statusColor)
            
            // Set remaining amount color
            val remainingColor = if (remaining >= 0) 
                android.graphics.Color.parseColor("#10B981") 
            else 
                android.graphics.Color.parseColor("#EF4444")
            views.setTextColor(R.id.remaining_amount, remainingColor)
            
            // Update progress bar
            views.setProgressBar(R.id.budget_progress, 100, progress, false)
            
            // Update stats
            views.setTextViewText(R.id.daily_avg, "${currency}${String.format("%.2f", dailyAvg)}")
            views.setTextViewText(R.id.days_left, daysLeft.toString())
            
            // Update top categories (for medium/large widgets)
            try {
                val categories = widgetData.optJSONArray("topCategories")
                if (categories != null && categories.length() > 0) {
                    val category1 = categories.optJSONObject(0)
                    if (category1 != null) {
                        val catSpending = category1.optDouble("spending", 0.0)
                        val catPercent = if (budget > 0) ((catSpending / budget) * 100).toInt() else 0
                        
                        views.setTextViewText(R.id.category1_name, category1.optString("name", "-"))
                        views.setTextViewText(R.id.category1_amount, "${currency}${String.format("%.2f", catSpending)}")
                        views.setTextViewText(R.id.category1_percent, "${catPercent}% of budget")
                    }
                }
            } catch (e: Exception) {
                // Category views don't exist in small widget
            }
            
        } catch (e: Exception) {
            // Use default values if data can't be read
            views.setTextViewText(R.id.spending_amount, "$0.00")
            views.setTextViewText(R.id.budget_amount, "of $0.00")
            views.setProgressBar(R.id.budget_progress, 100, 0, false)
        }
        
        // Set up quick add button - open app's quick-add screen via deep link
        val quickAddIntent = Intent(Intent.ACTION_VIEW).apply {
            data = Uri.parse("centsandsense://quick-add")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val quickAddPendingIntent = PendingIntent.getActivity(
            context, 0, quickAddIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.quick_add_button, quickAddPendingIntent)
        
        // Set up widget click to open app
        val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        val launchPendingIntent = PendingIntent.getActivity(
            context, 0, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_container, launchPendingIntent)
        
        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
    
    private fun readWidgetData(context: Context): JSONObject {
        val filesDir = context.filesDir
        val widgetDataFile = File(filesDir, "widget_data.json")
        
        if (widgetDataFile.exists()) {
            val jsonString = widgetDataFile.readText()
            return JSONObject(jsonString)
        }
        
        return JSONObject()
    }
    
    companion object {
        fun updateAllWidgets(context: Context) {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            
            // Update small widgets
            val smallWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, BudgetWidgetProvider::class.java)
            )
            val smallProvider = BudgetWidgetProvider()
            smallProvider.onUpdate(context, appWidgetManager, smallWidgetIds)
            
            // Update medium widgets
            val mediumWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, BudgetWidgetProviderMedium::class.java)
            )
            val mediumProvider = BudgetWidgetProviderMedium()
            mediumProvider.onUpdate(context, appWidgetManager, mediumWidgetIds)
            
            // Update large widgets
            val largeWidgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, BudgetWidgetProviderLarge::class.java)
            )
            val largeProvider = BudgetWidgetProviderLarge()
            largeProvider.onUpdate(context, appWidgetManager, largeWidgetIds)
        }
    }
}
