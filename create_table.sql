DEF sys_passwd=Hashino1127#

DEF pdb_name=pdb1

DEF db_user_name=c##bot

connect sys/&sys_passwd as sysdba

create user &db_user_name identified by &db_user_name default tablespace users container=all;
grant connect, dba to &db_user_name container=all;
alter user &db_user_name quota unlimited on users;

connect &db_user_name/&db_user_name
ALTER SESSION SET CONTAINER = &pdb_name;


create table delivery_status
( order_id varchar2(10) primary key,
  location varchar2(100),
  status varchar2(100),
  complete_flg char(1));





create table delivery_time_range
( range_id char(4) primary_key,
  from_time number(2),
  to_time number(2));

insert into delivery_time_range values('AM01', 8, 12);
insert into delivery_time_range values('PM01', 12, 14);
insert into delivery_time_range values('PM02', 12, 14);
insert into delivery_time_range values('PM03', 14, 16);
insert into delivery_time_range values('PM04', 16, 18);
insert into delivery_time_range values('PM05', 18, 20);
insert into delivery_time_range values('PM06', 20, 22);
commit;

create table delivery_schedule
( order_id varchar2(10) primary key,
  delivery_date date,
  dalivery_time_range char(4));

