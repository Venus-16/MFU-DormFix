-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 24, 2025 at 09:07 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `mfu_dormfix`
--

-- --------------------------------------------------------

--
-- Table structure for table `category`
--

CREATE TABLE `category` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `category`
--

INSERT INTO `category` (`category_id`, `category_name`) VALUES
(1, 'Electrical'),
(2, 'Plumbing'),
(3, 'Furniture'),
(4, 'Air Conditioning'),
(5, 'General');

-- --------------------------------------------------------

--
-- Table structure for table `dormitory`
--

CREATE TABLE `dormitory` (
  `dorm_id` int(11) NOT NULL,
  `dorm_name` varchar(100) NOT NULL,
  `dorm_capacity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `dormitory`
--

INSERT INTO `dormitory` (`dorm_id`, `dorm_name`, `dorm_capacity`) VALUES
(1, 'Lamduan 1', 100),
(2, 'Lamduan 2', 100),
(3, 'Lamduan 3', 98),
(4, 'Lamduan 4', 98),
(5, 'Lamduan 5', 98),
(6, 'Lamduan 7', 100),
(7, 'Lamduan 8', 5),
(9, 'Lamduan 9', 10);

-- --------------------------------------------------------

--
-- Table structure for table `dorm_staff`
--

CREATE TABLE `dorm_staff` (
  `staff_id` int(11) NOT NULL,
  `phone_number` varchar(10) NOT NULL,
  `dorm_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `dorm_staff`
--

INSERT INTO `dorm_staff` (`staff_id`, `phone_number`, `dorm_id`, `user_id`) VALUES
(1, '0812345678', 6, 5),
(2, '0987654321', 5, 20);

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `feedback_id` int(11) NOT NULL,
  `rating` tinyint(5) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `request_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `feedback`
--

INSERT INTO `feedback` (`feedback_id`, `rating`, `comment`, `request_id`) VALUES
(1, 4, 'Good', 3),
(3, 5, 'Good service.', 6),
(6, 5, 'Good service.', 24),
(9, 4, 'ดีมาก', 11);

-- --------------------------------------------------------

--
-- Table structure for table `major`
--

CREATE TABLE `major` (
  `major_id` int(11) NOT NULL,
  `major_name` varchar(100) NOT NULL,
  `school_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `major`
--

INSERT INTO `major` (`major_id`, `major_name`, `school_id`) VALUES
(1, 'Innovative Food Science and Technology', 1),
(2, 'Postharvest Technology and Logistics', 1),
(3, 'Beauty Technology', 2),
(4, 'Cosmetic Science', 2),
(5, 'Dental Surgery', 3),
(6, 'Environmental Health', 4),
(7, 'Occupational Health and Safety', 4),
(8, 'Public Health', 4),
(9, 'Sports and Health Science', 4),
(10, 'Computer Engineering', 5),
(11, 'Digital and Communication Engineering', 5),
(12, 'Digital Technology for Business Innovation', 5),
(13, 'Multimedia Technology and Animation', 5),
(14, 'Software Engineering', 5),
(15, 'Computer Science and Innovation', 5),
(16, 'Applied Thai Traditional Medicine', 6),
(17, 'Physical Therapy', 6),
(18, 'Traditional Chinese Medicine', 6),
(19, 'Laws', 7),
(20, 'Business Law and Chinese Communication', 7),
(21, 'English', 8),
(22, 'Thai Language and Culture for Foreigners', 8),
(23, 'Accounting', 9),
(24, 'Business Management', 9),
(25, 'Economics', 9),
(26, 'Medicine', 10),
(27, 'Nursing Science', 11),
(28, 'Applied Chemistry', 12),
(29, 'Biotechnology (Biological Science)', 12),
(30, 'Materials Engineering', 12),
(31, 'Business Chinese', 13),
(32, 'Chinese Language and Culture', 13),
(33, 'Chinese Studies', 13),
(34, 'Teaching Chinese Language', 13),
(35, 'International Development', 14);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `role` enum('student','staff','headtech','technician','admin') NOT NULL,
  `request_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `link` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`notification_id`, `user_id`, `role`, `request_id`, `title`, `message`, `link`, `is_read`, `created_at`) VALUES
(19, 5, 'staff', 26, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in room 7101.', '/staff/repair', 1, '2025-08-18 15:45:15'),
(20, 9, 'headtech', 26, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-08-18 15:45:15'),
(21, 1, 'admin', 26, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 1, '2025-08-18 15:45:15'),
(24, 5, 'staff', 28, 'New Repair Request', 'A new repair request \"Door knob\" has been submitted in room 7101.', '/staff/repair', 1, '2025-08-18 15:53:57'),
(25, 3, 'headtech', 28, 'New Repair Request', 'A new repair request \"Door knob\" has been submitted in Lamduan 7, room 7101.', '/head/request/general', 0, '2025-08-18 15:53:57'),
(26, 1, 'admin', 28, 'New Repair Request', 'A new repair request \"Door knob\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 1, '2025-08-18 15:53:57'),
(31, 5, 'staff', 28, 'Repair Request Updated', 'The repair request \"Door knob\" in room 7101 has been updated by the student.', '/staff/reapir', 1, '2025-08-18 16:24:12'),
(32, 3, 'headtech', 28, 'Repair Request Updated', 'Repair request \"Door knob\" in Lamduan 7, room 7101 was updated by the student.', '/head/request/general', 0, '2025-08-18 16:24:12'),
(42, 5, 'staff', 28, 'Repair Request Cancelled', 'The repair request \"Door knob\" in room 7101 has been cancelled.', '/staff/history', 1, '2025-08-19 13:24:48'),
(43, 3, 'headtech', 28, 'Repair Request Cancelled', 'Repair request \"Door knob\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/head/request/general', 0, '2025-08-19 13:24:48'),
(44, 1, 'admin', 28, 'Repair Request Cancelled', 'Repair request \"Door knob\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/admin/history', 1, '2025-08-19 13:24:48'),
(77, 2, 'student', 26, 'Repair Request Confirmed', 'Your repair request has been confirmed. Item: \"Fan\"', '/student/track', 1, '2025-08-19 14:09:15'),
(78, 5, 'staff', 26, 'Repair Request Confirmed', 'The repair request \"Fan\" in room 7101 has been confirmed by head technician.', '/staff/sch', 1, '2025-08-19 14:09:15'),
(79, 8, 'technician', 26, 'New Repair Assignment', 'You have been assigned a new repair request scheduled on 20 Aug 2025, 09:00.', '/tech/repairlist', 1, '2025-08-19 14:09:15'),
(80, 1, 'admin', 26, 'Repair Request Confirmed', 'Repair request \"Fan\" in Lamduan 7, room 7101 has been confirmed by head technician.', '/admin/scheduled', 1, '2025-08-19 14:09:15'),
(81, 2, 'student', 26, 'Repair Request Updated', 'Your repair request details have been updated. Item: \"Fan\"', '/student/track', 1, '2025-08-19 14:10:40'),
(82, 5, 'staff', 26, 'Repair Request Updated', 'The repair request \"Fan\" in room 7101 has been updated by head technician.', '/staff/sch', 1, '2025-08-19 14:10:40'),
(83, 8, 'technician', 26, 'Repair Request Schedule Updated', 'The repair schedule has been updated to 20 Aug 2025, 09:30.', '/tech/repairlist', 1, '2025-08-19 14:10:40'),
(84, 1, 'admin', 26, 'Repair Request Updated', 'Repair request \"Fan\" in Lamduan 7, room 7101 has been updated by head technician.', '/admin/scheduled', 1, '2025-08-19 14:10:40'),
(89, 2, 'student', 26, 'Repair Request Updated', 'Your repair request has been updated with a new technician. Item: \"Fan\"', '/student/track', 1, '2025-08-19 14:15:42'),
(90, 5, 'staff', 26, 'Repair Request Updated', 'The repair request \"Fan\" in room 7101 has been updated by head technician.', '/staff/sch', 1, '2025-08-19 14:15:42'),
(91, 10, 'technician', 26, 'Repair Request Reassigned', 'The repair request has been reassigned to another technician, you are no longer responsible for it.', NULL, 0, '2025-08-19 14:15:42'),
(92, 8, 'technician', 26, 'New Repair Assignment', 'You have been reassigned a repair request scheduled on 20 Aug 2025, 09:30.', '/tech/repairlist', 1, '2025-08-19 14:15:42'),
(93, 1, 'admin', 26, 'Repair Request Updated', 'Repair request \"Fan\" in Lamduan 7, room 7101 has been updated by head technician.', '/admin/scheduled', 1, '2025-08-19 14:15:42'),
(126, 2, 'student', 26, 'Repair Completed', 'Your repair request \"Fan\" has been completed.', '/student/track', 1, '2025-08-20 14:30:08'),
(127, 5, 'staff', 26, 'Repair Request Completed', 'The repair request \"Fan\" in room 7101 has been completed.', '/staff/history', 1, '2025-08-20 14:30:08'),
(128, 9, 'headtech', 26, 'Repair Request Completed', 'Repair request \"Fan\" in Lamduan 7, room 7101 has been completed by technician.', '/head/request/electrical', 1, '2025-08-20 14:30:08'),
(129, 1, 'admin', 26, 'Repair Request Completed', 'Repair request \"Fan\" in Lamduan 7, room 7101 has been completed by technician.', '/admin/history', 1, '2025-08-20 14:30:08'),
(130, 9, 'headtech', 26, 'New Feedback Submitted', 'Student submitted feedback for request \"Fan\" in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-08-20 14:39:18'),
(131, 8, 'technician', 26, 'New Feedback Received', 'A student submitted feedback for request \"Fan\" in Lamduan 7, room 7101.', '/tech/history', 1, '2025-08-20 14:39:18'),
(132, 9, 'headtech', NULL, 'New Technician Added', 'A new technician \"Tech Elec3\" has been added to your category.', NULL, 1, '2025-08-20 14:43:20'),
(133, 9, 'headtech', NULL, 'Technician Updated', 'Technician \"Tech3 Elec\" has been updated in your category.', NULL, 1, '2025-08-20 14:52:23'),
(135, 9, 'headtech', NULL, 'Technician Removed', 'Technician \"Tech3 Elec\" has been removed from your category.', NULL, 1, '2025-08-20 14:56:53'),
(138, 5, 'staff', NULL, 'New Student Added', 'Student \"Mod Ruji\" has been assigned to room 7101 in Lamduan 7.', '/staff/list', 1, '2025-08-20 15:02:11'),
(139, 5, 'staff', NULL, 'Students Imported', '2 new students have been added to Lamduan 7 via file import.', '/staff/list', 1, '2025-08-20 15:03:59'),
(140, 5, 'staff', NULL, 'Student Info Updated', 'Student \"KK Mn\" in room 7201, Lamduan 7 has updated their information.', '/staff/list', 1, '2025-08-20 15:05:12'),
(141, 5, 'staff', NULL, 'Student Disabled', 'Student \"Mod Ruji\" from room 7101, Lamduan 7 has been disabled.', '/staff/list', 1, '2025-08-20 15:09:16'),
(144, 5, 'staff', NULL, 'Room Added', 'Room 7102 (Capacity: 4) has been added to Lamduan 7.', NULL, 1, '2025-08-20 15:11:17'),
(151, 5, 'staff', NULL, 'Room Updated', 'Room 7102 in Lamduan 7 capacity changed from 4 → 2.', NULL, 1, '2025-08-20 15:14:28'),
(152, 5, 'staff', NULL, 'Room Deleted', 'Room 7215 has been deleted from Lamduan 7.', NULL, 1, '2025-08-20 15:15:08'),
(153, 5, 'staff', NULL, 'Dorm Updated', 'Dorm Lamduan 7 capacity changed from 98 → 100.', NULL, 1, '2025-08-20 15:15:48'),
(157, 5, 'staff', 29, 'New Repair Request', 'A new repair request \"Light\" has been submitted in room 7101.', '/staff/repair', 1, '2025-08-29 13:22:42'),
(158, 9, 'headtech', 29, 'New Repair Request', 'A new repair request \"Light\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-08-29 13:22:42'),
(159, 1, 'admin', 29, 'New Repair Request', 'A new repair request \"Light\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 1, '2025-08-29 13:22:42'),
(160, 5, 'staff', 29, 'Repair Request Updated', 'The repair request \"Light\" in room 7101 has been updated by the student.', '/staff/reapir', 1, '2025-08-29 13:23:05'),
(161, 9, 'headtech', 29, 'Repair Request Updated', 'Repair request \"Light\" in Lamduan 7, room 7101 was updated by the student.', '/head/request/electrical', 1, '2025-08-29 13:23:05'),
(162, 5, 'staff', 11, 'Repair Request Cancelled', 'The repair request \"Air \" in room 7101 has been cancelled.', '/staff/history', 1, '2025-08-29 13:23:17'),
(163, 1, 'admin', 11, 'Repair Request Cancelled', 'Repair request \"Air \" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/admin/history', 1, '2025-08-29 13:23:17'),
(164, 5, 'staff', 29, 'Repair Request Cancelled', 'The repair request \"Light\" in room 7101 has been cancelled.', '/staff/history', 1, '2025-08-29 13:23:48'),
(165, 9, 'headtech', 29, 'Repair Request Cancelled', 'Repair request \"Light\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/head/request/electrical', 1, '2025-08-29 13:23:48'),
(166, 1, 'admin', 29, 'Repair Request Cancelled', 'Repair request \"Light\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/admin/history', 1, '2025-08-29 13:23:48'),
(167, 2, 'student', 29, 'Repair Request Confirmed', 'Your repair request has been confirmed. Item: \"Light\"', '/student/track', 1, '2025-08-29 13:32:05'),
(168, 5, 'staff', 29, 'Repair Request Confirmed', 'The repair request \"Light\" in room 7101 has been confirmed by head technician.', '/staff/sch', 1, '2025-08-29 13:32:05'),
(169, 8, 'technician', 29, 'New Repair Assignment', 'You have been assigned a new repair request scheduled on 29 Aug 2025, 20:30.', '/tech/repairlist', 1, '2025-08-29 13:32:05'),
(170, 1, 'admin', 29, 'Repair Request Confirmed', 'Repair request \"Light\" in Lamduan 7, room 7101 has been confirmed by head technician.', '/admin/scheduled', 1, '2025-08-29 13:32:05'),
(171, 2, 'student', 29, 'Repair Request Updated', 'Your repair request details have been updated. Item: \"Light\"', '/student/track', 1, '2025-08-29 13:32:43'),
(172, 5, 'staff', 29, 'Repair Request Updated', 'The repair request \"Light\" in room 7101 has been updated by head technician.', '/staff/sch', 1, '2025-08-29 13:32:43'),
(173, 8, 'technician', 29, 'Repair Request Schedule Updated', 'The repair schedule has been updated to 29 Aug 2025, 20:31.', '/tech/repairlist', 1, '2025-08-29 13:32:43'),
(174, 1, 'admin', 29, 'Repair Request Updated', 'Repair request \"Light\" in Lamduan 7, room 7101 has been updated by head technician.', '/admin/scheduled', 1, '2025-08-29 13:32:43'),
(175, 2, 'student', 29, 'Repair Completed', 'Your repair request \"Light\" has been completed.', '/student/track', 1, '2025-08-29 13:37:17'),
(176, 5, 'staff', 29, 'Repair Request Completed', 'The repair request \"Light\" in room 7101 has been completed.', '/staff/history', 1, '2025-08-29 13:37:17'),
(177, 9, 'headtech', 29, 'Repair Request Completed', 'Repair request \"Light\" in Lamduan 7, room 7101 has been completed by technician.', '/head/request/electrical', 1, '2025-08-29 13:37:17'),
(178, 1, 'admin', 29, 'Repair Request Completed', 'Repair request \"Light\" in Lamduan 7, room 7101 has been completed by technician.', '/admin/history', 1, '2025-08-29 13:37:17'),
(179, 9, 'headtech', 29, 'New Feedback Submitted', 'Student submitted feedback for request \"Light\" in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-08-29 13:37:59'),
(180, 8, 'technician', 29, 'New Feedback Received', 'A student submitted feedback for request \"Light\" in Lamduan 7, room 7101.', '/tech/history', 1, '2025-08-29 13:37:59'),
(181, 5, 'staff', NULL, 'Room Added', 'Room 7102 (Capacity: 4) has been added to Lamduan 7.', NULL, 1, '2025-08-29 13:43:35'),
(182, 5, 'staff', NULL, 'Room Added', 'Room 7103 (Capacity: 4) has been added to Lamduan 7.', NULL, 1, '2025-08-29 13:43:35'),
(183, 5, 'staff', NULL, 'Room Added', 'Room 7104 (Capacity: 4) has been added to Lamduan 7.', NULL, 1, '2025-08-29 13:43:35'),
(184, 5, 'staff', NULL, 'Room Added', 'Room 7105 (Capacity: 4) has been added to Lamduan 7.', NULL, 1, '2025-08-29 13:43:35'),
(185, 5, 'staff', NULL, 'Room Deleted', 'Room 7102 has been deleted from Lamduan 7.', NULL, 1, '2025-08-29 13:45:33'),
(186, 5, 'staff', NULL, 'Room Updated', 'Room 7103 in Lamduan 7 capacity changed from 4 → 2.', NULL, 1, '2025-08-29 13:45:51'),
(187, 5, 'staff', NULL, 'Students Imported', '2 new students have been added to Lamduan 7 via file import.', '/staff/list', 1, '2025-08-29 13:48:31'),
(188, 5, 'staff', NULL, 'Room Updated', 'Room 7102 in Lamduan 7 capacity changed from 4 → 2.', NULL, 1, '2025-08-29 13:49:17'),
(189, 5, 'staff', NULL, 'New Student Added', 'Student \"Daw Rung\" has been assigned to room 7102 in Lamduan 7.', '/staff/list', 1, '2025-08-29 13:49:57'),
(190, 5, 'staff', NULL, 'Student Disabled', 'Student \"Daw Rung\" from room 7102, Lamduan 7 has been disabled.', '/staff/list', 1, '2025-08-29 13:50:21'),
(191, 9, 'headtech', NULL, 'New Technician Added', 'A new technician \"Electric 3\" has been added to your category.', NULL, 1, '2025-08-29 13:52:34'),
(192, 9, 'headtech', NULL, 'Technician Removed', 'Technician \"Tech Elec2\" has been removed from your category.', NULL, 1, '2025-08-29 13:52:57'),
(193, 9, 'headtech', NULL, 'Technician Updated', 'Technician \"Electric 3\" has been updated in your category.', NULL, 1, '2025-08-29 13:53:11'),
(197, 20, 'staff', 31, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in room 5101.', '/staff/repair', 0, '2025-08-29 14:17:28'),
(198, 9, 'headtech', 31, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 5, room 5101.', '/head/request/electrical', 1, '2025-08-29 14:17:28'),
(199, 1, 'admin', 31, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 5, room 5101.', '/admin/report', 1, '2025-08-29 14:17:28'),
(200, 5, 'staff', NULL, 'Student Disabled', 'Student \"AA ZZ\" from room 7201, Lamduan 7 has been disabled.', '/staff/list', 0, '2025-08-31 14:44:18'),
(201, 5, 'staff', NULL, 'Student Disabled', 'Student \"KK Mn\" from room 7201, Lamduan 7 has been disabled.', '/staff/list', 0, '2025-08-31 14:44:21'),
(202, 5, 'staff', NULL, 'Student Disabled', 'Student \"CC YY\" from room 7102, Lamduan 7 has been disabled.', '/staff/list', 0, '2025-08-31 14:44:23'),
(216, 5, 'staff', 33, 'New Repair Request', 'A new repair request \"พัดลม\" has been submitted in room 7101.', '/staff/repair', 0, '2025-09-04 15:16:28'),
(217, 9, 'headtech', 33, 'New Repair Request', 'A new repair request \"พัดลม\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-09-04 15:16:28'),
(218, 1, 'admin', 33, 'New Repair Request', 'A new repair request \"พัดลม\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 0, '2025-09-04 15:16:28'),
(223, 5, 'staff', 33, 'Repair Request Cancelled', 'The repair request \"พัดลม\" in room 7101 has been cancelled.', '/staff/history', 0, '2025-09-16 14:44:06'),
(224, 9, 'headtech', 33, 'Repair Request Cancelled', 'Repair request \"พัดลม\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/head/request/electrical', 1, '2025-09-16 14:44:06'),
(225, 1, 'admin', 33, 'Repair Request Cancelled', 'Repair request \"พัดลม\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/admin/history', 0, '2025-09-16 14:44:06'),
(226, 5, 'staff', 34, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in room 7101.', '/staff/repair', 0, '2025-09-16 14:50:04'),
(227, 9, 'headtech', 34, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-09-16 14:50:04'),
(228, 1, 'admin', 34, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 0, '2025-09-16 14:50:04'),
(229, 5, 'staff', 34, 'Repair Request Updated', 'The repair request \"Window Screen\" in room 7101 has been updated by the student.', '/staff/reapir', 0, '2025-09-16 14:53:21'),
(230, 3, 'headtech', 34, 'Repair Request Updated', 'Repair request \"Window Screen\" in Lamduan 7, room 7101 was updated by the student.', '/head/request/general', 0, '2025-09-16 14:53:21'),
(241, 5, 'staff', 37, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in room 7101.', '/staff/repair', 0, '2025-11-23 14:15:53'),
(242, 9, 'headtech', 37, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-11-23 14:15:53'),
(243, 1, 'admin', 37, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 0, '2025-11-23 14:15:53'),
(247, 5, 'staff', 34, 'Repair Request Cancelled', 'The repair request \"Window Screen\" in room 7101 has been cancelled.', '/staff/history', 0, '2025-11-23 14:16:23'),
(248, 3, 'headtech', 34, 'Repair Request Cancelled', 'Repair request \"Window Screen\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/head/request/general', 0, '2025-11-23 14:16:23'),
(249, 1, 'admin', 34, 'Repair Request Cancelled', 'Repair request \"Window Screen\" in Lamduan 7 dorm, room 7101 was cancelled by the student.', '/admin/history', 1, '2025-11-23 14:16:23'),
(250, 2, 'student', 37, 'Repair Request Confirmed', 'Your repair request has been confirmed. Item: \"Fan\"', '/student/track', 1, '2025-11-23 14:23:19'),
(251, 5, 'staff', 37, 'Repair Request Confirmed', 'The repair request \"Fan\" in room 7101 has been confirmed by head technician.', '/staff/sch', 0, '2025-11-23 14:23:19'),
(252, 8, 'technician', 37, 'New Repair Assignment', 'You have been assigned a new repair request scheduled on 25 Nov 2025, 09:30.', '/tech/repairlist', 0, '2025-11-23 14:23:19'),
(253, 1, 'admin', 37, 'Repair Request Confirmed', 'Repair request \"Fan\" in Lamduan 7, room 7101 has been confirmed by head technician.', '/admin/scheduled', 0, '2025-11-23 14:23:19'),
(254, 2, 'student', 11, 'Repair Completed', 'Your repair request \"Air \" has been completed.', '/student/track', 0, '2025-11-23 14:27:22'),
(255, 5, 'staff', 11, 'Repair Request Completed', 'The repair request \"Air \" in room 7101 has been completed.', '/staff/history', 0, '2025-11-23 14:27:22'),
(256, 1, 'admin', 11, 'Repair Request Completed', 'Repair request \"Air \" in Lamduan 7, room 7101 has been completed by technician.', '/admin/history', 0, '2025-11-23 14:27:22'),
(257, 5, 'staff', 38, 'New Repair Request', 'A new repair request \"Light\" has been submitted in room 7101.', '/staff/repair', 0, '2025-11-23 14:58:58'),
(258, 9, 'headtech', 38, 'New Repair Request', 'A new repair request \"Light\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-11-23 14:58:58'),
(259, 1, 'admin', 38, 'New Repair Request', 'A new repair request \"Light\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 0, '2025-11-23 14:58:58'),
(260, 5, 'staff', 39, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in room 7401.', '/staff/repair', 0, '2025-11-23 15:02:28'),
(261, 9, 'headtech', 39, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7401.', '/head/request/electrical', 1, '2025-11-23 15:02:28'),
(262, 1, 'admin', 39, 'New Repair Request', 'A new repair request \"Fan\" has been submitted in Lamduan 7, room 7401.', '/admin/report', 0, '2025-11-23 15:02:28'),
(263, 5, 'staff', 44, 'New Repair Request', 'A new repair request \"ไฟ\" has been submitted in room 7101.', '/staff/repair', 0, '2025-11-24 06:11:26'),
(264, 9, 'headtech', 44, 'New Repair Request', 'A new repair request \"ไฟ\" has been submitted in Lamduan 7, room 7101.', '/head/request/electrical', 1, '2025-11-24 06:11:26'),
(265, 1, 'admin', 44, 'New Repair Request', 'A new repair request \"ไฟ\" has been submitted in Lamduan 7, room 7101.', '/admin/report', 1, '2025-11-24 06:11:26'),
(266, 4, 'technician', 11, 'New Feedback Received', 'A student submitted feedback for request \"Air \" in Lamduan 7, room 7101.', '/tech/history', 0, '2025-11-24 06:13:01'),
(267, 2, 'student', 44, 'Repair Request Confirmed', 'Your repair request has been confirmed. Item: \"ไฟ\"', '/student/track', 0, '2025-11-24 06:18:12'),
(268, 5, 'staff', 44, 'Repair Request Confirmed', 'The repair request \"ไฟ\" in room 7101 has been confirmed by head technician.', '/staff/sch', 0, '2025-11-24 06:18:12'),
(269, 8, 'technician', 44, 'New Repair Assignment', 'You have been assigned a new repair request scheduled on 26 Nov 2025, 10:17.', '/tech/repairlist', 0, '2025-11-24 06:18:12'),
(270, 1, 'admin', 44, 'Repair Request Confirmed', 'Repair request \"ไฟ\" in Lamduan 7, room 7101 has been confirmed by head technician.', '/admin/scheduled', 1, '2025-11-24 06:18:12'),
(271, 2, 'student', 44, 'Repair Request Updated', 'Your repair request details have been updated. Item: \"ไฟ\"', '/student/track', 0, '2025-11-24 06:19:00'),
(272, 5, 'staff', 44, 'Repair Request Updated', 'The repair request \"ไฟ\" in room 7101 has been updated by head technician.', '/staff/sch', 0, '2025-11-24 06:19:00'),
(273, 8, 'technician', 44, 'Repair Request Schedule Updated', 'The repair schedule has been updated to 27 Nov 2025, 10:30.', '/tech/repairlist', 0, '2025-11-24 06:19:00'),
(274, 1, 'admin', 44, 'Repair Request Updated', 'Repair request \"ไฟ\" in Lamduan 7, room 7101 has been updated by head technician.', '/admin/scheduled', 1, '2025-11-24 06:19:00'),
(275, 2, 'student', 44, 'Repair Completed', 'Your repair request \"ไฟ\" has been completed.', '/student/track', 0, '2025-11-24 06:22:29'),
(276, 5, 'staff', 44, 'Repair Request Completed', 'The repair request \"ไฟ\" in room 7101 has been completed.', '/staff/history', 0, '2025-11-24 06:22:29'),
(277, 9, 'headtech', 44, 'Repair Request Completed', 'Repair request \"ไฟ\" in Lamduan 7, room 7101 has been completed by technician.', '/head/request/electrical', 0, '2025-11-24 06:22:29'),
(278, 1, 'admin', 44, 'Repair Request Completed', 'Repair request \"ไฟ\" in Lamduan 7, room 7101 has been completed by technician.', '/admin/history', 1, '2025-11-24 06:22:29'),
(279, 5, 'staff', NULL, 'Room Added', 'Room 8111 (Capacity: 4) has been added to Lamduan 7.', NULL, 0, '2025-11-24 06:31:20'),
(280, 5, 'staff', NULL, 'Room Deleted', 'Room 7103 has been deleted from Lamduan 7.', NULL, 0, '2025-11-24 06:31:47'),
(281, 20, 'staff', NULL, 'Student Disabled', 'Student \"Kao Kallaya\" from room 5101, Lamduan 5 has been disabled.', '/staff/list', 0, '2025-11-24 06:34:35'),
(282, 5, 'staff', NULL, 'Student Disabled', 'Student \"New Worrakamol\" from room 7401, Lamduan 7 has been disabled.', '/staff/list', 0, '2025-11-24 06:34:35');

-- --------------------------------------------------------

--
-- Table structure for table `repair_requests`
--

CREATE TABLE `repair_requests` (
  `request_id` int(11) NOT NULL,
  `article` varchar(100) NOT NULL,
  `description` text NOT NULL,
  `image` varchar(255) NOT NULL,
  `status` enum('Pending','Confirmed','Completed','Cancel') NOT NULL,
  `request_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `repair_date` datetime DEFAULT NULL,
  `complete_date` timestamp NULL DEFAULT NULL,
  `work_description` text DEFAULT NULL,
  `student_id` varchar(10) NOT NULL,
  `category_id` int(11) NOT NULL,
  `headtech_id` int(11) DEFAULT NULL,
  `technician_id` int(11) DEFAULT NULL,
  `dorm_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `repair_requests`
--

INSERT INTO `repair_requests` (`request_id`, `article`, `description`, `image`, `status`, `request_date`, `repair_date`, `complete_date`, `work_description`, `student_id`, `category_id`, `headtech_id`, `technician_id`, `dorm_id`, `room_id`) VALUES
(2, 'Water pipe', 'The water pipe at the sink is broken.', '/public/uploads/leaking.jpeg', 'Completed', '2025-07-08 08:17:11', '2025-07-18 09:00:35', '2025-08-07 06:13:52', 'Change a new one.', '6531501100', 5, 1, 2, 6, 23),
(3, 'Door knob', 'The door knob doesn\'t turn.', '/public/uploads/Door handle.png', 'Completed', '2025-07-02 08:16:18', '2025-07-03 19:00:34', '2025-07-03 11:50:34', 'Change a new one.', '6531501100', 5, 1, 2, 6, 23),
(4, 'Shelf', 'Broken shelf.', '/public/uploads/Shelf.jpg', 'Cancel', '2025-07-08 08:16:09', NULL, NULL, NULL, '6531501100', 3, NULL, NULL, 6, 23),
(6, 'Shelf', 'The shelf is broken.', '/public/uploads/1751875418222-899358534.jpg', 'Completed', '2025-07-09 05:50:31', '2025-07-12 12:00:15', '2025-07-13 05:49:15', 'Change a new one.', '6531501100', 3, 1, 2, 6, 21),
(8, 'Light', 'I turn on the light and it flickered.', '/public/uploads/1752468133260-259225665.jpg', 'Cancel', '2025-07-15 06:22:31', NULL, NULL, NULL, '6531501139', 1, NULL, NULL, 6, 23),
(9, 'Air', 'The air not cool.', '/public/uploads/1752560169545-750870873.jpg', 'Completed', '2025-07-31 07:05:48', '2025-07-31 13:00:29', '2025-07-31 07:04:29', 'Clean an air.', '6531501139', 4, 1, 2, 6, 23),
(10, 'Chair', 'Broken chair leg.', '/public/uploads/1752588970342-944979307.jpg', 'Completed', '2025-07-28 07:04:05', '2025-07-17 10:00:37', '2025-07-16 14:18:25', 'Change a new one.', '6531501100', 3, 1, 2, 6, 21),
(11, 'Air ', 'Air can not turn on.  ', '/public/uploads/1752981201746-908775519.jpg', 'Completed', '2025-09-11 15:45:31', '2025-09-15 10:00:38', '2025-11-23 14:27:22', 'It OK.', '6531501100', 4, 1, 2, 6, 21),
(12, 'Window', 'Broken window.', '/public/uploads/1752648399158-218557999.png', 'Completed', '2025-07-09 16:16:40', '2025-07-12 09:00:00', '2025-07-12 07:05:49', 'Change a new one.', '6531501139', 5, 1, 2, 6, 23),
(13, 'Window Screen', 'The window screen is broken.', '/public/uploads/1752727951652-345981785.png', 'Completed', '2025-07-16 16:17:34', '2025-07-18 13:35:00', '2025-07-18 06:44:35', 'Change new.', '6531501139', 5, 1, 2, 6, 23),
(22, 'Window Screen', 'It broken.', '/public/uploads/1755161085285-577223695.png', 'Completed', '2025-08-14 08:44:45', '2025-08-14 16:00:00', '2025-08-14 08:48:22', 'Change a new one.', '6531501100', 5, 1, 2, 6, 21),
(24, 'Window Screen', 'It broken.', '/public/uploads/1755245138704-756008144.png', 'Completed', '2025-08-15 08:05:38', '2025-08-18 16:25:00', '2025-08-15 08:28:35', 'Chang a new one.', '6531501100', 5, 1, 2, 6, 21),
(26, 'Fan', 'The fan blades are broken.', '/public/uploads/1755531914985-350708672.jpg', 'Completed', '2025-09-10 15:45:14', '2025-09-15 09:30:00', '2025-09-15 04:30:08', 'Change a new one.', '6531501100', 1, 4, 3, 6, 21),
(28, 'Door knob', 'It broken.', '/public/uploads/1755532437467-859914764.png', 'Cancel', '2025-08-18 15:53:57', NULL, NULL, NULL, '6531501100', 5, NULL, NULL, 6, 21),
(29, 'Light', 'ไฟไม่ติด 10 ดวง', '/public/uploads/1756473762864-570052995.jpg', 'Completed', '2025-08-29 13:22:42', '2025-08-29 20:31:00', '2025-08-29 13:37:17', 'เปลี่ยนหลอดใหม่', '6531501100', 1, 4, 3, 6, 21),
(31, 'Fan', 'It can not turn on.', '/public/uploads/1756477048070-87761786.jpg', 'Pending', '2025-11-20 14:17:28', NULL, NULL, NULL, '6531501139', 1, NULL, NULL, 5, 17),
(33, 'พัดลม', 'ใบพัดหัก', '/public/uploads/1756998988699-253063859.jpg', 'Cancel', '2025-09-04 15:16:28', NULL, NULL, NULL, '6531501100', 1, NULL, NULL, 6, 21),
(34, 'Window Screen', 'It broken.', '/public/uploads/1758034401440-19173560.png', 'Cancel', '2025-09-16 14:50:04', NULL, NULL, NULL, '6531501100', 5, NULL, NULL, 6, 21),
(37, 'Fan', 'It can not turn on.', '/public/uploads/1763907353014-837063168.jpg', 'Confirmed', '2025-11-20 14:15:53', '2025-11-25 09:30:00', NULL, NULL, '6531501100', 1, 4, 3, 6, 21),
(38, 'Light', 'เปิดไม่ติด', '/public/uploads/1763909938204-570426622.jpg', 'Pending', '2025-11-23 14:58:58', NULL, NULL, NULL, '6531501100', 1, NULL, NULL, 6, 21),
(39, 'Fan', 'ใบพัดหัก', '/public/uploads/1763910148290-838702509.jpg', 'Pending', '2025-11-23 15:02:28', NULL, NULL, NULL, '6531501169', 1, NULL, NULL, 6, 24),
(40, 'Fan', 'ใบพัดหัก', '/public/uploads/1763910148290-838702509.jpg', 'Confirmed', '2025-11-23 15:02:28', '2025-11-24 11:00:40', NULL, NULL, '6531501169', 1, 4, 5, 6, 24),
(41, 'Fan', 'ใบพัดหัก', '/public/uploads/1763910148290-838702509.jpg', 'Confirmed', '2025-11-23 15:02:28', '2025-11-24 10:00:40', NULL, NULL, '6531501169', 1, 4, 5, 6, 24),
(42, 'Fan', 'ใบพัดหัก', '/public/uploads/1763910148290-838702509.jpg', 'Confirmed', '2025-11-23 15:02:28', '2025-11-24 14:30:40', NULL, NULL, '6531501169', 1, 4, 5, 6, 24),
(43, 'Fan', 'ใบพัดหัก', '/public/uploads/1763910148290-838702509.jpg', 'Confirmed', '2025-11-23 15:02:28', '2025-11-24 14:00:40', NULL, NULL, '6531501169', 1, 4, 5, 6, 24),
(44, 'ไฟ', 'ไฟกระพริบ', '/public/uploads/1763964686828-478459416.jpg', 'Completed', '2025-11-24 06:11:26', '2025-11-27 10:30:00', '2025-11-24 06:22:29', 'เปลี่ยนหลอดใหม่', '6531501100', 1, 4, 3, 6, 21);

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `room_id` int(11) NOT NULL,
  `room_number` varchar(10) NOT NULL,
  `room_capacity` int(11) NOT NULL,
  `dorm_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`room_id`, `room_number`, `room_capacity`, `dorm_id`) VALUES
(1, '1101', 4, 1),
(2, '1201', 4, 1),
(3, '1301', 4, 1),
(4, '1401', 4, 1),
(5, '2101', 4, 2),
(6, '2201', 4, 2),
(7, '2301', 4, 2),
(8, '2401', 4, 2),
(9, '3101', 4, 3),
(10, '3201', 4, 3),
(11, '3301', 4, 3),
(12, '3401', 4, 3),
(13, '4101', 4, 4),
(14, '4201', 4, 4),
(15, '4301', 4, 4),
(16, '4401', 4, 4),
(17, '5101', 4, 5),
(18, '5201', 4, 5),
(19, '5301', 4, 5),
(20, '5401', 4, 5),
(21, '7101', 4, 6),
(22, '7201', 4, 6),
(23, '7301', 4, 6),
(24, '7401', 4, 6),
(26, '7210', 4, 6),
(27, '7211', 4, 6),
(28, '7212', 4, 6),
(29, '7213', 4, 6),
(30, '7214', 4, 6),
(32, '7102', 2, 6),
(34, '7104', 4, 6),
(35, '7105', 4, 6),
(36, '8101', 2, 7),
(37, '8102', 2, 7),
(38, '8103', 2, 7),
(39, '8104', 2, 7),
(40, '8105', 2, 7),
(41, '8111', 4, 6);

-- --------------------------------------------------------

--
-- Table structure for table `school`
--

CREATE TABLE `school` (
  `school_id` int(11) NOT NULL,
  `school_name` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `school`
--

INSERT INTO `school` (`school_id`, `school_name`) VALUES
(1, 'School of Agro-Industry'),
(2, 'School of Cosmetic Science'),
(3, 'School of Dentistry'),
(4, 'School of Health Science'),
(5, 'School of Applied Digital Technology\r\n'),
(6, 'School of Integrative Medicine'),
(7, 'School of Law'),
(8, 'School of Liberal Arts'),
(9, 'School of Management'),
(10, 'School of Medicine'),
(11, 'School of Nursing'),
(12, 'School of Science'),
(13, 'School of Sinology'),
(14, 'School of Social Innovation');

-- --------------------------------------------------------

--
-- Table structure for table `student`
--

CREATE TABLE `student` (
  `student_id` varchar(10) NOT NULL,
  `school_id` int(11) NOT NULL,
  `major_id` int(11) NOT NULL,
  `dorm_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `student`
--

INSERT INTO `student` (`student_id`, `school_id`, `major_id`, `dorm_id`, `room_id`, `user_id`) VALUES
('6531501100', 5, 10, 7, 37, 2),
('6531501131', 1, 1, 7, 36, 15),
('6531501132', 2, 4, 7, 36, 16),
('6531501133', 3, 5, 6, 32, 17),
('6531501134', 4, 7, 6, 32, 18),
('6531501139', 5, 10, 5, 17, 6),
('6531501167', 5, 10, 6, 32, 19),
('6531501168', 5, 10, 6, 21, 14),
('6531501169', 5, 10, 6, 24, 7);

-- --------------------------------------------------------

--
-- Table structure for table `technicians`
--

CREATE TABLE `technicians` (
  `technician_id` int(11) NOT NULL,
  `phone_number` varchar(10) NOT NULL,
  `job_position` varchar(100) NOT NULL,
  `category_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `technicians`
--

INSERT INTO `technicians` (`technician_id`, `phone_number`, `job_position`, `category_id`, `user_id`) VALUES
(1, '0912345678', 'Head Technician', 5, 3),
(2, '0887654321', 'Technician', 5, 4),
(3, '0987654321', 'Technician', 1, 8),
(4, '0012345647', 'Head Technician', 1, 9),
(5, '0987347824', 'Technician', 1, 10),
(6, '0326245787', 'Technician', 1, 11);

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(60) DEFAULT NULL,
  `status` int(2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `name`, `email`, `password`, `status`) VALUES
(1, 'Admin', 'admin@test.com', '$2b$10$k59zU6Yd9N9kRbws1dLOFOVJAfelZwzpt8Q.fwKoz6ezQ88NkTWwy', 1),
(2, 'Student Test', 'student@lamduan.mfu.ac.th', '$2b$10$i63iWgZ5nNocDFU1CscQSetgE4y10ytWz1yP1BuFL/U/sYp14s6Lu', 0),
(3, 'Head Technician', 'head@mfu.ac.th', '$2b$10$NpUffqQbq6wss.1COyz8TO7XdpvAQSqHcISGAE0vn.EWMfWqdOR2i', 1),
(4, 'Technician Test', 'tech@mfu.ac.th', '$2b$10$rirNO/Yn5O1BHJ65HwEt3eKAb0hCNxo6ikH7lt8LycG35KVL5CYKO', 1),
(5, 'Domitory Staff', 'staff@mfu.ac.th', '$2b$10$oh.cBtjqmM/tbuXZAliVHOiIO8IXQy4fkrS3NAt9thMo.OeQjM7oe', 1),
(6, 'Kao Kallaya', 'kao@lamduan.mfu.ac.th', '$2b$10$i63iWgZ5nNocDFU1CscQSetgE4y10ytWz1yP1BuFL/U/sYp14s6Lu', 0),
(7, 'New Worrakamol', 'new@lamduan.mfu.ac.th', '$2b$10$VEMMgAGrbIlLietbX.uUdOYlD9oUkVYr1jeWQN13rxFDlN/4X/jsK', 0),
(8, 'Tech Elec', 'elec@mfu.ac.th', '$2b$10$nEi.N6NwqclCFlvC3qxnlOdu9E9LadP4nZq1KBLo17fSYakz2k/Xm', 1),
(9, 'Head Elec', 'headelec@mfu.ac.th', '$2b$10$oFu/7S5v7X9w3wSNJLpJG.6pRbpAuWPzVU8iQawmt1/woFlWFJiYa', 1),
(10, 'Tech Elec2', 'elec2@mfu.ac.th', NULL, 1),
(11, 'Electric 3', 'elec3@mfu.ac.th', NULL, 1),
(14, 'Mod Ruji', 'mod@lamduan.mfu.ac.th', NULL, 0),
(15, 'AA ZZ', '6531501131@lamduan.mfu.ac.th', '$2b$10$DTJCWYcb5UOzRWREew1ELOOM0HFaMD./jU8WW6DxOWYDjSI4J2DnK', 0),
(16, 'BB XX', '6531501132@lamduan.mfu.ac.th', NULL, 1),
(17, 'CC YY', '6531501133@lamduan.mfu.ac.th', NULL, 0),
(18, 'DD WW', '6531501134@lamduan.mfu.ac.th', NULL, 1),
(19, 'Daw Rung', '6531501167@lamduan.mfu.ac.th', NULL, 0),
(20, 'Staff L5', 'staff5@mfu.ac.th', NULL, 1);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `category`
--
ALTER TABLE `category`
  ADD PRIMARY KEY (`category_id`);

--
-- Indexes for table `dormitory`
--
ALTER TABLE `dormitory`
  ADD PRIMARY KEY (`dorm_id`);

--
-- Indexes for table `dorm_staff`
--
ALTER TABLE `dorm_staff`
  ADD PRIMARY KEY (`staff_id`),
  ADD KEY `fk_staff` (`user_id`),
  ADD KEY `fk_dorm_staff` (`dorm_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`feedback_id`),
  ADD KEY `fk_feedback` (`request_id`);

--
-- Indexes for table `major`
--
ALTER TABLE `major`
  ADD PRIMARY KEY (`major_id`),
  ADD KEY `fk_school_major` (`school_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `fk_notification_user` (`user_id`),
  ADD KEY `fk_notification_request` (`request_id`);

--
-- Indexes for table `repair_requests`
--
ALTER TABLE `repair_requests`
  ADD PRIMARY KEY (`request_id`),
  ADD KEY `fk_student_request` (`student_id`),
  ADD KEY `fk_category_request` (`category_id`),
  ADD KEY `fk_head_request` (`headtech_id`),
  ADD KEY `fk_tech_request` (`technician_id`),
  ADD KEY `fk_dorm_request` (`dorm_id`),
  ADD KEY `fk_room_request` (`room_id`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `fk_room_dorm` (`dorm_id`);

--
-- Indexes for table `school`
--
ALTER TABLE `school`
  ADD PRIMARY KEY (`school_id`);

--
-- Indexes for table `student`
--
ALTER TABLE `student`
  ADD PRIMARY KEY (`student_id`),
  ADD KEY `fk_student` (`user_id`),
  ADD KEY `fk_school` (`school_id`),
  ADD KEY `fk_major` (`major_id`),
  ADD KEY `fk_dorm` (`dorm_id`),
  ADD KEY `fk_room` (`room_id`);

--
-- Indexes for table `technicians`
--
ALTER TABLE `technicians`
  ADD PRIMARY KEY (`technician_id`),
  ADD KEY `fk_tech` (`user_id`),
  ADD KEY `fk_category` (`category_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `category`
--
ALTER TABLE `category`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `dormitory`
--
ALTER TABLE `dormitory`
  MODIFY `dorm_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `dorm_staff`
--
ALTER TABLE `dorm_staff`
  MODIFY `staff_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `feedback_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `major`
--
ALTER TABLE `major`
  MODIFY `major_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=283;

--
-- AUTO_INCREMENT for table `repair_requests`
--
ALTER TABLE `repair_requests`
  MODIFY `request_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `school`
--
ALTER TABLE `school`
  MODIFY `school_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `technicians`
--
ALTER TABLE `technicians`
  MODIFY `technician_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `dorm_staff`
--
ALTER TABLE `dorm_staff`
  ADD CONSTRAINT `fk_dorm_staff` FOREIGN KEY (`dorm_id`) REFERENCES `dormitory` (`dorm_id`),
  ADD CONSTRAINT `fk_staff` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `fk_feedback` FOREIGN KEY (`request_id`) REFERENCES `repair_requests` (`request_id`);

--
-- Constraints for table `major`
--
ALTER TABLE `major`
  ADD CONSTRAINT `fk_school_major` FOREIGN KEY (`school_id`) REFERENCES `school` (`school_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notification_request` FOREIGN KEY (`request_id`) REFERENCES `repair_requests` (`request_id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE;

--
-- Constraints for table `repair_requests`
--
ALTER TABLE `repair_requests`
  ADD CONSTRAINT `fk_category_request` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `fk_dorm_request` FOREIGN KEY (`dorm_id`) REFERENCES `dormitory` (`dorm_id`),
  ADD CONSTRAINT `fk_head_request` FOREIGN KEY (`headtech_id`) REFERENCES `technicians` (`technician_id`),
  ADD CONSTRAINT `fk_room_request` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `fk_student_request` FOREIGN KEY (`student_id`) REFERENCES `student` (`student_id`),
  ADD CONSTRAINT `fk_tech_request` FOREIGN KEY (`technician_id`) REFERENCES `technicians` (`technician_id`);

--
-- Constraints for table `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `fk_room_dorm` FOREIGN KEY (`dorm_id`) REFERENCES `dormitory` (`dorm_id`);

--
-- Constraints for table `student`
--
ALTER TABLE `student`
  ADD CONSTRAINT `fk_dorm` FOREIGN KEY (`dorm_id`) REFERENCES `dormitory` (`dorm_id`),
  ADD CONSTRAINT `fk_major` FOREIGN KEY (`major_id`) REFERENCES `major` (`major_id`),
  ADD CONSTRAINT `fk_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `fk_school` FOREIGN KEY (`school_id`) REFERENCES `school` (`school_id`),
  ADD CONSTRAINT `fk_student` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `technicians`
--
ALTER TABLE `technicians`
  ADD CONSTRAINT `fk_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`category_id`),
  ADD CONSTRAINT `fk_tech` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
