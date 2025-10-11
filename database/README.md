\# Agriculture Marketplace Database



\## Setup Instructions



1\. Create database:

&nbsp;  ```sql

&nbsp;  CREATE DATABASE agriculture\_marketplace;

Import schema:



bash

psql agriculture\_marketplace < schema.sql

Tables

users - All platform users



crop\_batches - Farmer crop submissions



crop\_images - Crop photographs



quality\_measurements - AI \& sensor quality data



grading\_rules - Quality standards



market\_listings - Active sales listings



transactions - Purchase records



admins - Administrator accounts



admin\_actions - Admin activity log



disputes - User conflict resolution



For Backend Development

Use connection string:



text

postgresql://username:password@localhost:5432/agriculture\_marketplace

Team Members

Dhriti Rana - Database Design \& Management



Aryan Panwar - Backend Development



Rahul Singh Parmar - AI/Computer Vision



Aditya Chandra - Frontend Development

