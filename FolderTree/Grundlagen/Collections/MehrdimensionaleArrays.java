public class MehrdimensionaleArrays {
    public static void main(String[] args) {
        int[][] matrix = {{1, 2}, {3, 4}, {5, 6}};

        for (int[] zeile : matrix) {
            for (int wert : zeile) {
                System.out.println("Matrixwert: " + wert);
            }
        }
    }
}
