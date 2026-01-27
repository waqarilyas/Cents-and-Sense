package com.budgetplanner.app

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import org.json.JSONArray
import java.io.File

class BudgetWidgetModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "BudgetWidgetModule"
    }
    
    @ReactMethod
    fun updateWidgets(promise: Promise) {
        try {
            BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun reloadAllWidgets(promise: Promise) {
        try {
            BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun isWidgetSupported(promise: Promise) {
        promise.resolve(true)
    }
    
    @ReactMethod
    fun getWidgetDataPath(promise: Promise) {
        try {
            val filesDir = reactApplicationContext.filesDir
            val widgetDataPath = filesDir.absolutePath + "/widget_data.json"
            promise.resolve(widgetDataPath)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun writeWidgetData(dataMap: ReadableMap, promise: Promise) {
        try {
            val filesDir = reactApplicationContext.filesDir
            val widgetDataFile = File(filesDir, "widget_data.json")
            
            // Convert ReadableMap to JSON
            val jsonObject = JSONObject()
            
            // Spending widget data
            jsonObject.put("currentSpending", dataMap.getDouble("spending"))
            jsonObject.put("monthlyBudget", dataMap.getDouble("budget"))
            jsonObject.put("currency", dataMap.getString("currency"))
            
            // Top categories for spending widget
            val categoriesArray = JSONArray()
            if (dataMap.hasKey("categories")) {
                val categories = dataMap.getArray("categories")
                if (categories != null) {
                    for (i in 0 until categories.size()) {
                        val category = categories.getMap(i)
                        if (category != null) {
                            val catObj = JSONObject()
                            catObj.put("name", category.getString("name"))
                            catObj.put("spending", category.getDouble("spending"))
                            categoriesArray.put(catObj)
                        }
                    }
                }
            }
            jsonObject.put("topCategories", categoriesArray)
            
            // Goals data
            val goalsArray = JSONArray()
            if (dataMap.hasKey("goals")) {
                val goals = dataMap.getArray("goals")
                if (goals != null) {
                    for (i in 0 until goals.size()) {
                        val goal = goals.getMap(i)
                        if (goal != null) {
                            val goalObj = JSONObject()
                            goalObj.put("name", goal.getString("name"))
                            goalObj.put("currentAmount", goal.getDouble("currentAmount"))
                            goalObj.put("targetAmount", goal.getDouble("targetAmount"))
                            goalsArray.put(goalObj)
                        }
                    }
                }
            }
            jsonObject.put("goals", goalsArray)
            
            // Accounts data
            val accountsArray = JSONArray()
            if (dataMap.hasKey("accounts")) {
                val accounts = dataMap.getArray("accounts")
                if (accounts != null) {
                    for (i in 0 until accounts.size()) {
                        val account = accounts.getMap(i)
                        if (account != null) {
                            val accObj = JSONObject()
                            accObj.put("name", account.getString("name"))
                            accObj.put("type", account.getString("type"))
                            accObj.put("balance", account.getDouble("balance"))
                            accountsArray.put(accObj)
                        }
                    }
                }
            }
            jsonObject.put("accounts", accountsArray)
            
            // Category budgets data
            val categoryBudgetsArray = JSONArray()
            if (dataMap.hasKey("categoryBudgets")) {
                val categoryBudgets = dataMap.getArray("categoryBudgets")
                if (categoryBudgets != null) {
                    for (i in 0 until categoryBudgets.size()) {
                        val budget = categoryBudgets.getMap(i)
                        if (budget != null) {
                            val budgetObj = JSONObject()
                            budgetObj.put("category", budget.getString("category"))
                            budgetObj.put("spent", budget.getDouble("spent"))
                            budgetObj.put("limit", budget.getDouble("limit"))
                            categoryBudgetsArray.put(budgetObj)
                        }
                    }
                }
            }
            jsonObject.put("categoryBudgets", categoryBudgetsArray)
            
            // Write to file
            widgetDataFile.writeText(jsonObject.toString(2))
            
            android.util.Log.d("BudgetWidget", "Widget data written successfully")
            android.util.Log.d("BudgetWidget", "Goals: ${goalsArray.length()}, Accounts: ${accountsArray.length()}, Category Budgets: ${categoryBudgetsArray.length()}")
            
            // Trigger all widget updates
            BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
            GoalsWidgetProvider.updateAllWidgets(reactApplicationContext)
            AccountsWidgetProvider.updateAllWidgets(reactApplicationContext)
            CategoryBudgetsWidgetProvider.updateAllWidgets(reactApplicationContext)
            
            promise.resolve(widgetDataFile.absolutePath)
        } catch (e: Exception) {
            android.util.Log.e("BudgetWidget", "Failed to write widget data", e)
            promise.reject("ERROR", "Failed to write widget data: ${e.message}", e)
        }
    }
    
    @ReactMethod
    fun writeTestData(promise: Promise) {
        try {
            val filesDir = reactApplicationContext.filesDir
            val widgetDataFile = File(filesDir, "widget_data.json")
            
            // Write test data
            val testData = """
            {
              "currentSpending": 1250.50,
              "monthlyBudget": 2000.00,
              "currency": "USD",
              "topCategories": [
                {"name": "Food", "spending": 450.00},
                {"name": "Transport", "spending": 300.50},
                {"name": "Entertainment", "spending": 200.00}
              ]
            }
            """.trimIndent()
            
            widgetDataFile.writeText(testData)
            
            android.util.Log.d("BudgetWidget", "Test data written to: ${widgetDataFile.absolutePath}")
            
            // Trigger widget update
            BudgetWidgetProvider.updateAllWidgets(reactApplicationContext)
            
            promise.resolve("Test data written successfully")
        } catch (e: Exception) {
            android.util.Log.e("BudgetWidget", "Failed to write test data", e)
            promise.reject("ERROR", "Failed to write test data: ${e.message}", e)
        }
    }
}
