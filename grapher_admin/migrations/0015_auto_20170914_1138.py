# -*- coding: utf-8 -*-
# Generated by Django 1.11 on 2017-09-14 11:38
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('grapher_admin', '0014_merge_20170914_0952'),
    ]

    operations = [
        migrations.AlterField(
            model_name='dataset',
            name='description',
            field=models.TextField(),
        ),
    ]
