"""Illustrative planning assumptions, not quoted provider tariffs."""
from math import ceil

def economics(price=999, print_pack=120, delivery=180, payment=30,
              acquisition=150, support=80, alerts=12, wa=3,
              sms_fraction=.25, sms=2, fixed_month=25000):
    communication = alerts * (wa + sms_fraction * sms)
    variable = print_pack + delivery + payment + acquisition + support + communication
    contribution = price - variable
    return dict(communication=communication, variable_cost=variable,
                contribution=contribution,
                new_sales_to_cover_fixed=ceil(fixed_month/contribution) if contribution>0 else None)

if __name__ == '__main__':
    for label, args in [('Base assumptions', {}),
                        ('Higher acquisition/delivery', {'acquisition':300,'delivery':250}),
                        ('High alert volume', {'alerts':120})]:
        print(label, economics(**args))
    print('Excludes salaries, tax and ongoing service liability. Not recurring break-even.')
