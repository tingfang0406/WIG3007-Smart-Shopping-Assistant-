import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View, Alert } from "react-native";
import * as Speech from "expo-speech";

// Replace this with your machine's IP address when testing on a real device.
// Example: "http://192.168.1.10:5000"
const BACKEND_URL = "http://192.168.100.39:5000";

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [detectedItem, setDetectedItem] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  const cameraRef = useRef(null);

  // Request camera permission (mobile only)
  useEffect(() => {
    if (Platform.OS !== "web" && !permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  //addToCart button function
  const addToCart = () => {
    if (!detectedItem) return;

    const existing = cartItems.find((i) => i.name === detectedItem.name);
    let message = "";
    
    if (existing) {
      setCartItems(
        cartItems.map((i) =>
          i.name === detectedItem.name ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
      const newQuantity = existing.quantity + 1;
      const newTotal = cartItems.reduce((sum, i) => {
        if (i.name === detectedItem.name) {
          return sum + i.price * newQuantity;
        }
        return sum + i.price * i.quantity;
      }, 0) + detectedItem.price;
      message = `${detectedItem.name} added to cart. Total is now ${newTotal.toFixed(2)} ringgit.`;
    } else {
      setCartItems([...cartItems, { ...detectedItem, quantity: 1 }]);
      const newTotal = totalCost + detectedItem.price;
      message = `${detectedItem.name} added to cart. Total is now ${newTotal.toFixed(2)} ringgit.`;
    }
    
    // Play voice on phone
    if (Platform.OS !== "web") {
      Speech.speak(message, {
        language: "en",
        pitch: 1.0,
        rate: 0.9,
      });
    }
    
    setDetectedItem(null);
  };

  const scanItem = async () => {
    if (!cameraRef.current || isScanning) return;

    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6,
      });

      const response = await fetch(`${BACKEND_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: photo.base64 }),
      });

      const json = await response.json();

      if (json.status === "found") {
        setDetectedItem({ name: json.item, price: json.unit_price });
        // Play voice message on phone
        if (json.message && Platform.OS !== "web") {
          Speech.speak(json.message, {
            language: "en",
            pitch: 1.0,
            rate: 0.9,
          });
        }
      } else if (json.status === "unknown") {
        setDetectedItem(null);
        const message = `Item not recognized. Detected: ${json.item || "Unknown"}`;
        Alert.alert("Item not recognized", message);
        if (Platform.OS !== "web") {
          Speech.speak(message);
        }
      } else {
        setDetectedItem(null);
        Alert.alert("Error", json.message || "Failed to detect item");
        if (json.message && Platform.OS !== "web") {
          Speech.speak(json.message);
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Error scanning item");
    } finally {
      setIsScanning(false);
    }
  };

  const removeItem = (name) => {
    const itemToRemove = cartItems.find((item) => item.name === name);
    const newCartItems = cartItems.filter((item) => item.name !== name);
    setCartItems(newCartItems);
    
    // Calculate new total
    const newTotal = newCartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    
    // Voice feedback
    const message = `${name} removed from cart. Total is now ${newTotal.toFixed(2)} ringgit.`;
    if (Platform.OS !== "web") {
      Speech.speak(message, {
        language: "en",
        pitch: 1.0,
        rate: 0.9,
      });
    }
  };

  const totalCost = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // HANDLE WEB
  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <Text style={{ fontSize: 20, marginBottom: 10 }}>📷 Camera Preview Disabled on Web</Text>
        <Text style={{ opacity: 0.6, marginBottom: 20 }}>
          (Expo-camera does not work fully in web mode)
        </Text>

        <TouchableOpacity
          style={[styles.addButton, { opacity: detectedItem ? 1 : 0.5 }]}
          disabled={!detectedItem}
          onPress={addToCart}
        >
          <Text style={styles.btnText}>
            {detectedItem ? `Add ${detectedItem.name} to Cart` : "Detecting Item..."}
          </Text>
        </TouchableOpacity>

        <View style={styles.cart}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>🛒 Cart ({cartItems.length})</Text>
          </View>
          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Scan items to add them</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(i) => i.name}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <View style={styles.cartItemLeft}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemDetails}>
                        {item.quantity}x • RM{item.price.toFixed(2)} each
                      </Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemTotal}>
                        RM{(item.price * item.quantity).toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeItem(item.name)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                style={styles.cartList}
              />
              <View style={styles.cartFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.total}>RM{totalCost.toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  // MOBILE CAMERA PERMISSION
  if (!permission) {
    return <Text style={styles.center}>Requesting camera permission...</Text>;
  }

  if (!permission.granted) {
    return <Text style={styles.center}>Camera permission denied</Text>;
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
      />

      {/* Detected Item Card */}
      {detectedItem && (
        <View style={styles.detectedCard}>
          <View style={styles.detectedContent}>
            <Text style={styles.detectedEmoji}>✅</Text>
            <View style={styles.detectedInfo}>
              <Text style={styles.detectedName}>{detectedItem.name}</Text>
              <Text style={styles.detectedPrice}>RM{detectedItem.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Scanning Overlay */}
      {isScanning && (
        <View style={styles.scanningOverlay}>
          <View style={styles.scanningCard}>
            <Text style={styles.scanningText}>🔍 Scanning...</Text>
          </View>
        </View>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={scanItem}
          disabled={isScanning}
        >
          <Text style={styles.btnText}>
            {isScanning ? "Scanning..." : "Scan Item"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.addButton, !detectedItem && styles.addButtonDisabled]}
          disabled={!detectedItem}
          onPress={addToCart}
        >
          <Text style={styles.btnText}>
            {detectedItem ? `Add ${detectedItem.name} to Cart` : "Scan an item first"}
          </Text>
        </TouchableOpacity>

        {/* Cart */}
        <View style={styles.cart}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>Cart ({cartItems.length})</Text>
          </View>

          {cartItems.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>Scan items to add them</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={cartItems}
                keyExtractor={(item) => item.name}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <View style={styles.cartItemLeft}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemDetails}>
                        {item.quantity}x • RM{item.price.toFixed(2)} each
                      </Text>
                    </View>
                    <View style={styles.cartItemRight}>
                      <Text style={styles.cartItemTotal}>
                        RM{(item.price * item.quantity).toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => removeItem(item.name)}
                      >
                        <Text style={styles.removeBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                style={styles.cartList}
              />

              <View style={styles.cartFooter}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.total}>RM{totalCost.toFixed(2)}</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webContainer: {
    flex: 1,
    alignItems: "center",
    paddingTop: 40,
    backgroundColor: "#f3f3f3",
  },
  center: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
  },
  // Detected Item Card
  detectedCard: {
    position: "absolute",
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  detectedContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  detectedEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  detectedInfo: {
    flex: 1,
  },
  detectedName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  detectedPrice: {
    fontSize: 18,
    color: "#ff6b00",
    fontWeight: "600",
  },
  // Scanning Overlay
  scanningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 20,
  },
  scanningCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scanningText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
  },
  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    paddingBottom: 30,
    paddingTop: 10,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  scanButton: {
    width: "88%",
    paddingVertical: 18,
    backgroundColor: "#0066ff",
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#0066ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonDisabled: {
    backgroundColor: "#999",
    opacity: 0.7,
  },
  addButton: {
    width: "88%",
    paddingVertical: 18,
    backgroundColor: "#ff6b00",
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#ff6b00",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonDisabled: {
    backgroundColor: "#ccc",
    opacity: 0.6,
  },
  btnText: { color: "white", fontSize: 18, fontWeight: "600" },
  // Cart
  cart: {
    width: "88%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cartHeader: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 8,
  },
  cartTitle: {
    fontWeight: "700",
    fontSize: 18,
    color: "#333",
  },
  cartList: {
    maxHeight: 180,
  },
  emptyCart: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyCartText: {
    fontSize: 16,
    color: "#999",
    fontWeight: "600",
    marginBottom: 4,
  },
  emptyCartSubtext: {
    fontSize: 14,
    color: "#bbb",
  },
  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  cartItemLeft: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  cartItemDetails: {
    fontSize: 13,
    color: "#666",
  },
  cartItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    minWidth: 70,
    textAlign: "right",
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ff4444",
    justifyContent: "center",
    alignItems: "center",
  },
  removeBtnText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  cartFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: "#eee",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  total: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ff6b00",
  },
});
