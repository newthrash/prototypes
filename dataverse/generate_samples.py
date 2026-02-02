# Generate sample datasets for DataVerse
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import json

# Sample 1: Stock Prices
dates = pd.date_range('2023-01-01', '2024-01-01', freq='D')
n_days = len(dates)

np.random.seed(42)
stock_data = {
    'date': dates.strftime('%Y-%m-%d').tolist(),
    'open': (100 + np.cumsum(np.random.randn(n_days) * 2)).tolist(),
    'high': (102 + np.cumsum(np.random.randn(n_days) * 2.5)).tolist(),
    'low': (98 + np.cumsum(np.random.randn(n_days) * 1.8)).tolist(),
    'close': (100 + np.cumsum(np.random.randn(n_days) * 2.2)).tolist(),
    'volume': np.random.randint(1000000, 10000000, n_days).tolist()
}
df_stocks = pd.DataFrame(stock_data)
df_stocks.to_csv('/Users/moltitasker/.openclaw/workspace/prototypes/dataverse/data/samples/stock_prices.csv', index=False)

# Sample 2: Population Data
countries = ['China', 'India', 'USA', 'Indonesia', 'Pakistan', 'Brazil', 'Nigeria', 'Bangladesh', 'Russia', 'Mexico']
population_data = {
    'country': countries,
    'population_millions': [1412, 1380, 331, 274, 225, 213, 211, 166, 143, 130],
    'gdp_billions': [17734, 3730, 25462, 1319, 346, 1608, 440, 460, 1778, 1290],
    'growth_rate': [0.2, 0.8, 0.4, 0.9, 1.9, 0.7, 2.4, 1.0, -0.1, 0.8],
    'life_expectancy': [77, 70, 79, 72, 67, 76, 55, 73, 72, 75],
    'continent': ['Asia', 'Asia', 'North America', 'Asia', 'Asia', 'South America', 'Africa', 'Asia', 'Europe', 'North America']
}
df_population = pd.DataFrame(population_data)
df_population.to_csv('/Users/moltitasker/.openclaw/workspace/prototypes/dataverse/data/samples/population.csv', index=False)

# Sample 3: Sales Data
products = ['Laptop', 'Phone', 'Tablet', 'Watch', 'Headphones', 'Camera', 'Speaker', 'Monitor']
regions = ['North', 'South', 'East', 'West']
quarters = ['Q1', 'Q2', 'Q3', 'Q4']

sales_records = []
for product in products:
    for region in regions:
        for quarter in quarters:
            sales_records.append({
                'product': product,
                'region': region,
                'quarter': quarter,
                'units_sold': np.random.randint(100, 1000),
                'revenue': np.random.randint(50000, 500000),
                'profit': np.random.randint(10000, 150000),
                'customer_satisfaction': round(np.random.uniform(3.5, 5.0), 2)
            })
df_sales = pd.DataFrame(sales_records)
df_sales.to_csv('/Users/moltitasker/.openclaw/workspace/prototypes/dataverse/data/samples/sales_data.csv', index=False)

# Sample 4: COVID-19 Cases
np.random.seed(123)
covid_dates = pd.date_range('2020-03-01', '2021-06-01', freq='W')
countries_covid = ['USA', 'India', 'Brazil', 'UK', 'Russia', 'France', 'Italy', 'Spain']

covid_records = []
for date in covid_dates:
    for country in countries_covid:
        base_cases = {'USA': 50000, 'India': 30000, 'Brazil': 25000, 'UK': 10000, 
                      'Russia': 15000, 'France': 12000, 'Italy': 10000, 'Spain': 8000}[country]
        multiplier = 1 + (date - covid_dates[0]).days / 365  # Growth over time
        
        covid_records.append({
            'date': date.strftime('%Y-%m-%d'),
            'country': country,
            'new_cases': int(base_cases * multiplier * (0.5 + np.random.random())),
            'total_cases': int(base_cases * multiplier * 50 * (0.8 + np.random.random() * 0.4)),
            'deaths': int(base_cases * multiplier * 0.02 * (0.8 + np.random.random() * 0.4)),
            'recoveries': int(base_cases * multiplier * 0.9 * (0.8 + np.random.random() * 0.4)),
            'vaccination_rate': min(100, (date - covid_dates[0]).days / 3)
        })
df_covid = pd.DataFrame(covid_records)
df_covid.to_csv('/Users/moltitasker/.openclaw/workspace/prototypes/dataverse/data/samples/covid_cases.csv', index=False)

# Sample 5: Planetary Data
planetary_data = {
    'planet': ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'],
    'distance_from_sun_au': [0.39, 0.72, 1.0, 1.52, 5.20, 9.58, 19.22, 30.05],
    'diameter_km': [4879, 12104, 12742, 6779, 139820, 116460, 50724, 49244],
    'mass_earth_units': [0.055, 0.815, 1.0, 0.107, 317.8, 95.2, 14.5, 17.1],
    'moons': [0, 0, 1, 2, 95, 146, 27, 14],
    'orbital_period_days': [88, 225, 365, 687, 4333, 10759, 30687, 60190],
    'temperature_celsius': [167, 464, 15, -65, -110, -140, -195, -200],
    'type': ['Terrestrial', 'Terrestrial', 'Terrestrial', 'Terrestrial', 
             'Gas Giant', 'Gas Giant', 'Ice Giant', 'Ice Giant']
}
df_planets = pd.DataFrame(planetary_data)
df_planets.to_csv('/Users/moltitasker/.openclaw/workspace/prototypes/dataverse/data/samples/planetary_data.csv', index=False)

print("✓ Sample datasets created successfully!")
print("\nDatasets:")
print(f"  - Stocks: {len(df_stocks)} rows")
print(f"  - Population: {len(df_population)} rows")
print(f"  - Sales: {len(df_sales)} rows")
print(f"  - COVID: {len(df_covid)} rows")
print(f"  - Planets: {len(df_planets)} rows")
