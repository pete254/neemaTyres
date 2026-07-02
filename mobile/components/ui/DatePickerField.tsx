"use client";
import { useState } from "react";
import {
  View, Text, TouchableOpacity, Modal, Platform, StyleSheet,
} from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
}

function parseLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function DatePickerField({ value, onChange }: Props) {
  const [show, setShow] = useState(false);
  const date = parseLocal(value);

  const formatted = date.toLocaleDateString("en-KE", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });

  function handleChange(_: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(toIso(selected));
  }

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={18} color="#EAB308" />
        <Text style={styles.triggerText}>{formatted}</Text>
        <Ionicons name="chevron-down-outline" size={14} color="#555" />
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <Text style={styles.iosTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                textColor="#ffffff"
                style={styles.iosSpinner}
              />
            </View>
          </View>
        </Modal>
      ) : (
        show && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleChange}
          />
        )
      )}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1C1C1C",
    borderWidth: 1,
    borderColor: "#2A2A2A",
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
  },
  triggerText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
  },
  iosOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  iosSheet: {
    backgroundColor: "#111",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 36,
  },
  iosHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  iosTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  iosDone: {
    color: "#EAB308",
    fontSize: 16,
    fontWeight: "600",
  },
  iosSpinner: {
    height: 200,
  },
});
